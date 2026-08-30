"""Gemini narrative wrapper.

Turns the three agents' structured forecasts into a short, plain-English
executive summary. Implemented as a thin wrapper around the raw
generateContent REST endpoint (rather than the SDK) so it has no extra
package dependency and isn't pinned to a specific SDK's model-name
conventions.

Fails soft everywhere: no API key, a timeout, or a bad response simply
means no summary is produced — it never blocks or fails the analysis.
"""

import json
import logging
import httpx
import config

logger = logging.getLogger("prism.llm")


class GeminiNarrator:
    def __init__(self, api_key: str = None, model: str = None, timeout: float = 12.0):
        self.api_key = api_key or config.GEMINI_API_KEY
        self.model = model or config.GEMINI_MODEL
        self.timeout = timeout

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def _call(self, prompt: str, generation_config: dict, label: str):
        """POST to generateContent and return the response text, or None.
        Every failure mode is logged with enough detail to diagnose from
        Render's logs (bad key, wrong model name, quota, malformed JSON)
        without ever raising — callers always fail soft."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        try:
            response = httpx.post(
                url,
                params={"key": self.api_key},
                json={"contents": [{"parts": [{"text": prompt}]}], "generationConfig": generation_config},
                timeout=self.timeout,
            )
        except httpx.RequestError as e:
            logger.warning("Gemini %s: request failed (network/timeout): %s", label, e)
            return None

        if response.status_code >= 400:
            logger.warning(
                "Gemini %s: HTTP %s from model=%r — %s",
                label, response.status_code, self.model, response.text[:500],
            )
            return None

        try:
            candidates = response.json().get("candidates") or []
        except Exception as e:
            logger.warning("Gemini %s: response wasn't valid JSON: %s — body: %s", label, e, response.text[:500])
            return None

        if not candidates:
            logger.warning("Gemini %s: no candidates in response — body: %s", label, response.text[:500])
            return None

        finish_reason = candidates[0].get("finishReason")
        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(part.get("text", "") for part in parts).strip()
        if not text:
            logger.warning("Gemini %s: empty text (finishReason=%r) — candidate: %s", label, finish_reason, candidates[0])
            return None
        return text

    def summarize(self, agent_results: dict):
        """Return a short executive summary string, or None if unavailable."""
        if not self.enabled:
            return None
        text = self._call(
            self._build_prompt(agent_results),
            {"temperature": 0.4, "maxOutputTokens": 400},
            label="summarize",
        )
        return text or None

    def explain_scenarios(self, agent_results: dict) -> dict:
        """Return {scenario_key: plain-English 1-2 sentence translation} for
        each of conservative/moderate/aggressive — decodes the jargon in
        that scenario's own `insight` sentence (model name, ARIMA order,
        MAPE, etc.) into everyday language for someone new to forecasting.
        Fails soft -> {} on no key, timeout, or a bad/unparseable response."""
        if not self.enabled:
            return {}
        scenarios = {
            key: agent_results[key]
            for key in ("conservative", "moderate", "aggressive")
            if agent_results.get(key) and not agent_results[key].get("error")
        }
        if not scenarios:
            return {}
        text = self._call(
            self._build_explain_prompt(scenarios),
            {"temperature": 0.3, "maxOutputTokens": 500, "responseMimeType": "application/json"},
            label="explain_scenarios",
        )
        if not text:
            return {}
        try:
            parsed = json.loads(text)
        except Exception as e:
            logger.warning("Gemini explain_scenarios: couldn't parse JSON out of model output: %s — text: %s", e, text[:500])
            return {}
        return {
            key: value for key, value in parsed.items()
            if key in scenarios and isinstance(value, str) and value.strip()
        }

    @staticmethod
    def _build_explain_prompt(scenarios: dict) -> str:
        lines = [f'  "{key}": "{agent.get("insight", "")}"' for key, agent in scenarios.items()]
        joined = ",\n".join(lines)
        keys = ", ".join(scenarios.keys())
        return (
            "You explain statistical forecasting results to business users who are new "
            "to data science, not to other data scientists. Below is a JSON object — "
            "each key is a forecast scenario, each value is a technical sentence "
            "describing that scenario's result. For each one, write a 1-2 sentence "
            "plain-English translation of its technical sentence: same meaning, but no "
            "jargon left unexplained. Specifically: if it names a model like "
            "'ARIMA(2, 0, 2)', briefly say in plain words what that kind of model does "
            "and what those numbers mean (how many recent days it looks at, whether it "
            "needed to strip out a trend first, how many of its own past errors it "
            "corrects for). If it mentions MAPE, explain it as the average percent the "
            "model's guesses were off by on real days it hadn't seen. Keep a confident, "
            "professional tone - accessible, not childish or over-explained.\n\n"
            f"Respond with ONLY a JSON object with exactly these keys ({keys}), each "
            "mapped to your plain-English explanation string, and nothing else "
            "(no markdown fences, no extra keys).\n\n"
            f"{{\n{joined}\n}}"
        )

    @staticmethod
    def _build_prompt(agent_results: dict) -> str:
        conservative = agent_results.get("conservative", {})
        moderate = agent_results.get("moderate", {})
        aggressive = agent_results.get("aggressive", {})
        return (
            "You are a sales analytics assistant. Below are three revenue forecasts for the same "
            "company - cautious, expected, and optimistic 30-day scenarios - produced by statistical "
            "forecasting models. Write a concise executive summary (max 120 words, plain prose, no markdown "
            "headers or bullet symbols) covering: (1) the overall outlook, (2) what drives the spread "
            "between the scenarios, and (3) one concrete, actionable recommendation.\n\n"
            f"Cautious (conservative): ${conservative.get('forecasted_total_revenue')} over "
            f"{conservative.get('forecast_days')} days. {conservative.get('insight', '')}\n"
            f"Expected (moderate): ${moderate.get('forecasted_total_revenue')} over "
            f"{moderate.get('forecast_days')} days. {moderate.get('insight', '')}\n"
            f"Optimistic (aggressive): ${aggressive.get('forecasted_total_revenue')} over "
            f"{aggressive.get('forecast_days')} days. {aggressive.get('insight', '')}\n"
        )
