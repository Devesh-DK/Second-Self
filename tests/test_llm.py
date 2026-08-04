import os
import unittest
from unittest import mock

from src import llm


class LLMTests(unittest.TestCase):
    def test_call_llm_uses_groq_api_when_key_present(self):
        fake_response = mock.Mock()
        fake_response.raise_for_status.return_value = None
        fake_response.json.return_value = {
            "choices": [{"message": {"content": "{" + '"status":"ok"' + "}"}}]
        }

        with mock.patch.dict(os.environ, {"GROQ_API_KEY": "dummy-key"}, clear=False):
            if llm.requests is None:
                llm.requests = mock.Mock()
                llm.requests.post.return_value = fake_response
            with mock.patch.object(llm.requests, "post", return_value=fake_response) as post_mock:
                response = llm.call_llm("Summarize this", system="You are helpful")

        self.assertIn("ok", response)
        post_mock.assert_called_once()
        headers = post_mock.call_args.kwargs["headers"]
        self.assertIn("Authorization", headers)
        self.assertIn("dummy-key", headers["Authorization"])


if __name__ == "__main__":
    unittest.main()
