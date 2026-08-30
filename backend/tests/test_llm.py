"""Tests for the Gemini narrative wrapper.

Never hits the real API — these only check the fail-soft contract (no
key configured -> None/{} rather than raising) and that the prompt
builders don't blow up on realistic agent output. The actual API call
is a thin, mostly-untestable network boundary by design.
"""

from llm import GeminiNarrator


def make_narrator():
    return GeminiNarrator(api_key="", model="gemini-2.5-flash")


class TestFailSoft:
    def test_disabled_without_api_key(self):
        assert make_narrator().enabled is False

    def test_summarize_returns_none_without_key(self):
        assert make_narrator().summarize({}) is None

    def test_explain_scenarios_returns_empty_dict_without_key(self):
        agents = {
            "conservative": {"insight": "test"},
            "moderate": {"insight": "test"},
            "aggressive": {"insight": "test"},
        }
        assert make_narrator().explain_scenarios(agents) == {}

    def test_explain_scenarios_skips_error_agents(self):
        narrator = GeminiNarrator(api_key="fake-key-not-real")
        agents = {
            "conservative": {"error": "not enough data"},
            "moderate": {"error": "not enough data"},
            "aggressive": {"error": "not enough data"},
        }
        # all three scenarios errored -> nothing to explain -> short-circuits
        # before ever making a network call
        assert narrator.explain_scenarios(agents) == {}


class TestPromptBuilders:
    def test_summary_prompt_includes_each_scenario(self):
        agents = {
            "conservative": {"forecasted_total_revenue": 100, "forecast_days": 30, "insight": "cautious insight"},
            "moderate": {"forecasted_total_revenue": 200, "forecast_days": 30, "insight": "expected insight"},
            "aggressive": {"forecasted_total_revenue": 300, "forecast_days": 30, "insight": "optimistic insight"},
        }
        prompt = GeminiNarrator._build_prompt(agents)
        assert "cautious insight" in prompt
        assert "expected insight" in prompt
        assert "optimistic insight" in prompt

    def test_explain_prompt_asks_to_decode_arima_and_mape(self):
        agents = {"moderate": {"insight": "ARIMA(2, 0, 2) (backtested MAPE 37.21%)"}}
        prompt = GeminiNarrator._build_explain_prompt(agents)
        assert "ARIMA" in prompt
        assert "MAPE" in prompt
        assert "moderate" in prompt
