"""
================================================================================
  OLLAMA PYTHON TEMPLATE — Llama3:8b on WSL
  Library: `requests` (HTTP calls) + `json` (standard lib)
================================================================================

CORE CONCEPTS & KEYWORDS
─────────────────────────────────────────────────────────────────────────────
  ENDPOINT         The local URL Ollama exposes. Default: http://localhost:11434
                   On WSL this is accessible from the same machine without
                   any extra config.

  MODEL            The model tag to target, e.g. "llama3:8b".
                   Run `ollama list` in your terminal to see available models.

  PROMPT           The raw text instruction you send to the model.

  SYSTEM PROMPT    A hidden instruction that sets the model's role/behavior
                   before the conversation starts. Acts as a persistent context.

  TEMPERATURE      Controls randomness. Range 0.0–2.0.
                   Low  (0.0–0.4) → focused, deterministic, factual
                   Mid  (0.5–0.9) → balanced (default ~0.8)
                   High (1.0–2.0) → creative, varied, unpredictable

  TOP_P            Nucleus sampling. Keeps only the top % of probable tokens.
                   Lower = more focused. Usually left at 0.9.

  TOP_K            Limits token choices to the K most likely at each step.
                   Lower = less random. Common values: 20–60.

  MAX_TOKENS       Maximum number of tokens the model can generate in reply.
                   (Called `num_predict` in Ollama.)

  CONTEXT WINDOW   Total tokens the model can "see" at once (prompt + reply).
                   Llama3:8b default: 8192 tokens. Set via `num_ctx`.

  STREAMING        When True, the response arrives token-by-token (real-time).
                   When False, you wait for the full reply before receiving it.

  MESSAGES         A list of {"role": ..., "content": ...} dicts used for
                   multi-turn chat. Roles: "system", "user", "assistant".

  KEEP_ALIVE       How long Ollama keeps the model loaded in VRAM after a call.
                   "5m" = 5 minutes. "0" = unload immediately. "-1" = forever.

  RAW MODE         Sends the prompt without any template formatting.
                   Useful when you want full manual control over the input.

  EMBEDDINGS       Vector representation of text. Used for semantic search,
                   RAG pipelines, etc. — see generate_embedding().

OLLAMA API ROUTES USED
─────────────────────────────────────────────────────────────────────────────
  POST /api/generate   → single-turn completion (raw prompt)
  POST /api/chat       → multi-turn conversation (messages list)
  POST /api/embeddings → generate an embedding vector
  GET  /api/tags       → list locally available models

INSTALL
─────────────────────────────────────────────────────────────────────────────
  pip install requests
================================================================================
"""

import json
import requests

# ── Configuration ─────────────────────────────────────────────────────────────

BASE_URL  = "http://localhost:11434"   # Ollama server (WSL/localhost)
MODEL     = "llama3:8b"               # Change to any model from `ollama list`

# Default generation parameters — override per-call as needed
DEFAULTS = {
    "temperature": 0.7,
    "top_p":       0.9,
    "top_k":       40,
    "num_predict": 512,    # max tokens to generate
    "num_ctx":     4096,   # context window size
}


# ── Helper ────────────────────────────────────────────────────────────────────

def _post(route: str, payload: dict) -> dict:
    """Send a POST request to Ollama and return the parsed JSON response."""
    url = f"{BASE_URL}{route}"
    try:
        response = requests.post(url, json=payload, timeout=120)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.ConnectionError:
        raise SystemExit(
            "❌  Cannot reach Ollama. Is it running? Try: `ollama serve`"
        )


# ── Example 1 — Simple single-turn prompt ─────────────────────────────────────

def simple_prompt(prompt: str) -> str:
    """
    Send a one-shot prompt and return the model's reply as a string.
    Best for: quick questions, one-off tasks.
    """
    payload = {
        "model":  MODEL,
        "prompt": prompt,
        "stream": False,
        "options": DEFAULTS,
    }
    result = _post("/api/generate", payload)
    return result["response"]


# ── Example 2 — Prompt with a system instruction ──────────────────────────────

def prompt_with_system(system: str, prompt: str) -> str:
    """
    Send a prompt with a system message that sets the model's persona/behavior.
    Best for: role-playing, tone control, domain-specific assistants.

    Args:
        system: The system instruction (e.g. "You are a concise Linux expert.")
        prompt: The user's actual question or task.
    """
    payload = {
        "model":  MODEL,
        "system": system,
        "prompt": prompt,
        "stream": False,
        "options": DEFAULTS,
    }
    result = _post("/api/generate", payload)
    return result["response"]


# ── Example 3 — Streaming response (token by token) ───────────────────────────

def streaming_prompt(prompt: str) -> None:
    """
    Stream the model's reply to stdout as it is generated.
    Best for: long outputs, interactive CLI tools, perceived speed.
    """
    url     = f"{BASE_URL}/api/generate"
    payload = {
        "model":  MODEL,
        "prompt": prompt,
        "stream": True,
        "options": DEFAULTS,
    }

    print("📡 Streaming response:\n")
    with requests.post(url, json=payload, stream=True, timeout=120) as resp:
        resp.raise_for_status()
        for line in resp.iter_lines():
            if line:
                chunk = json.loads(line)
                print(chunk.get("response", ""), end="", flush=True)
                if chunk.get("done"):
                    break
    print("\n")  # newline after stream ends


# ── Example 4 — Multi-turn chat (conversation history) ────────────────────────

class ChatSession:
    """
    Maintains a running conversation with the model.
    Each call appends to the history so the model remembers prior turns.
    Best for: chatbots, iterative refinement, back-and-forth dialogue.

    Usage:
        session = ChatSession(system="You are a helpful Python tutor.")
        print(session.chat("What is a decorator?"))
        print(session.chat("Can you show me a simple example?"))
    """

    def __init__(self, system: str = "You are a helpful assistant."):
        self.messages: list[dict] = [
            {"role": "system", "content": system}
        ]

    def chat(self, user_message: str) -> str:
        self.messages.append({"role": "user", "content": user_message})

        payload = {
            "model":    MODEL,
            "messages": self.messages,
            "stream":   False,
            "options":  DEFAULTS,
        }
        result = _post("/api/chat", payload)
        reply  = result["message"]["content"]

        # Store assistant reply so the next turn has full context
        self.messages.append({"role": "assistant", "content": reply})
        return reply

    def reset(self, system: str = None) -> None:
        """Clear history (optionally change the system prompt)."""
        self.messages = [
            {"role": "system", "content": system or self.messages[0]["content"]}
        ]


# ── Example 5 — Controlled output (low temperature, short reply) ──────────────

def factual_query(prompt: str) -> str:
    """
    Low temperature + limited tokens for precise, concise factual answers.
    Best for: classification, yes/no questions, extraction tasks.
    """
    payload = {
        "model":  MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            **DEFAULTS,
            "temperature": 0.1,   # near-deterministic
            "num_predict": 128,   # short reply
        },
    }
    result = _post("/api/generate", payload)
    return result["response"]


# ── Example 6 — Generate an embedding vector ──────────────────────────────────

def generate_embedding(text: str) -> list[float]:
    """
    Return a vector embedding for the given text.
    Best for: semantic search, similarity comparison, RAG pipelines.

    Note: not all models support embeddings well. For dedicated embeddings
    consider pulling `nomic-embed-text` via `ollama pull nomic-embed-text`.
    """
    payload = {
        "model":  MODEL,
        "prompt": text,
    }
    result = _post("/api/embeddings", payload)
    return result["embedding"]


# ── Example 7 — List available local models ───────────────────────────────────

def list_models() -> list[str]:
    """Return the names of all models currently available in Ollama."""
    url      = f"{BASE_URL}/api/tags"
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    models   = response.json().get("models", [])
    return [m["name"] for m in models]


# ── BSE ──

def slugify(string: str) -> str:
    return string.lower().replace(' ','-')

def write_to_file(string: str, mode: str="truncate"):

    file = open("concept_list.txt","w" if mode == "truncate" else "a")

    file.write(string)

    file.close()

def build_prompt(root_concept:str, concept_list_length:int, exclude_list):
    prompt = f"""
    > You are an expert knowledge cartographer.
    >
    > Core concept: **{root_concept}**
    >
    > Task: Identify the most semantically close and structurally related concepts to this core concept.
    >
    > Constraints:
    >
    > * Return exactly **{concept_list_length}** concepts.
    > * Concepts must be directly related (first-order proximity).
    > * Avoid examples, explanations, commentary, or formatting.
    > * Do not include the following concepts : {exclude_list}
    > * Avoid duplicates or near-synonyms of the same idea.
    > * Prefer canonical academic or industry-standard concept names.
    > * Each concept must be 1–4 words maximum.
    >
    > Output format:
    >
    > * Return ONLY a plain list.
    > * One concept per line.
    > * No numbering.
    > * No additional text before or after the list.
    """

    return prompt


# ── Main — quick demo of each function ────────────────────────────────────────

if __name__ == "__main__":

    # root_concept = slugify(input("[root-concept]: "))
    root_concept = "Computer Science"
    concept_list_length = 25
    exclude_list = [root_concept]

    prompt = build_prompt(root_concept, concept_list_length, exclude_list)
    response = simple_prompt(prompt)
    formatted_response = '\n'.join([root_concept + ": " + e for e in response.split('\n')])
    write_to_file(formatted_response+"\n")

    for concept in response.split('\n'):
        exclude_list.append(concept)

    for concept in response.split('\n'):
        prompt = build_prompt(concept, concept_list_length, exclude_list)
        response_loop = simple_prompt(prompt)
        formatted_response = '\n'.join([concept + ": " + e for e in response_loop.split('\n')])
        write_to_file(formatted_response, "append")
        for concept in response_loop.split('\n'):
            exclude_list.append(concept)

    # Loop Iteration 2

    # write_to_file(simple_prompt(prompt))



    # write_to_file(root_concept)


    # --- EXAMPLES ---
    # print("=" * 60)
    # print("  Available models:", list_models())
    # print("=" * 60)

    # # 1. Simple prompt
    # print("\n[1] Simple prompt")
    # print(simple_prompt("In one sentence, what is the Pythagorean theorem?"))

    # # 2. System prompt
    # print("\n[2] System prompt")
    # reply = prompt_with_system(
    #     system="You are a pirate who only speaks in pirate slang.",
    #     prompt="Explain what a neural network is."
    # )
    # print(reply)

    # # 3. Streaming
    # print("\n[3] Streaming prompt")
    # streaming_prompt("List 3 benefits of using Linux.")

    # # 4. Multi-turn chat
    # print("\n[4] Multi-turn chat")
    # session = ChatSession(system="You are a concise Python tutor.")
    # print("User: What is a list comprehension?")
    # print("Bot:", session.chat("What is a list comprehension?"))
    # print("User: Show me a quick example.")
    # print("Bot:", session.chat("Show me a quick example."))

    # # 5. Factual / low-temp
    # print("\n[5] Factual query")
    # print(factual_query("What is the capital of Japan? Answer in one word."))

    # # 6. Embedding (just show vector length)
    # print("\n[6] Embedding")
    # vec = generate_embedding("Hello, world!")
    # print(f"Embedding vector length: {len(vec)}")