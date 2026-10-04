# TeKAI local AI setup (Ollama)

TeKAI runs on a **local AI model** and needs **no cloud API key**. It talks to
[Ollama](https://ollama.com) through CyberTeKa's server route (`/api/tekai`),
so your questions never leave your machine.

```
TeKAI UI  →  /api/tekai  →  AI provider layer  →  Ollama  →  local model
```

If Ollama is not running (or the model is missing), TeKAI shows a clear setup
message instead of inventing an answer.

## 1. Install Ollama

- Windows / macOS: download from <https://ollama.com/download>
- Linux: `curl -fsSL https://ollama.com/install.sh | sh`

## 2. Start Ollama

Ollama usually runs automatically after install. To start it manually:

```bash
ollama serve
```

The service listens on `http://localhost:11434` by default.

## 3. Install a model (you choose it — nothing is downloaded automatically)

Pick a model that fits your hardware. Smaller models need less RAM and no GPU.

| Model | Approx. download | Notes |
| --- | --- | --- |
| `llama3.2:1b` | ~1.3 GB | Smallest; good on low-resource machines |
| `llama3.2` | ~2 GB | Good general balance |
| `qwen2.5:3b` | ~2 GB | Strong at technical explanations |
| `llama3.1:8b` | ~4.7 GB | Better quality; needs ~8 GB RAM |

```bash
ollama pull llama3.2
```

List what you have installed:

```bash
ollama list
```

## 4. Configure CyberTeKa

Create `.env.local` in the project root (copy `.env.example`) and set:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

`OLLAMA_MODEL` must match the name from `ollama list` (for example `llama3.2`).

## 5. Start CyberTeKa

```bash
npm run dev
```

## 6. Open TeKAI

Go to `/tekai`. The badge should read **Local AI ready**. Ask a question, for
example "What is Linux?".

## 7. Troubleshooting

| Message | Cause | Fix |
| --- | --- | --- |
| "TeKAI can't connect to the local AI service." | Ollama is not running | Run `ollama serve` |
| "The configured TeKAI model is not available." | Model not installed or name mismatch | `ollama pull <model>` and set `OLLAMA_MODEL` to match |
| "TeKAI took too long to respond." | Model too large / still loading | Try a smaller model such as `llama3.2:1b` |
| "unexpected response from the local AI service" | `OLLAMA_BASE_URL` is wrong | Verify the URL and port |

Press **Recheck** in TeKAI after fixing a problem.

## Using another provider (optional)

Ollama is the default. To use an OpenAI-compatible server instead (OpenAI,
Groq, OpenRouter, LM Studio, vLLM), set in `.env.local`:

```env
TEKAI_PROVIDER=openai-compatible
TEKAI_API_URL=http://localhost:11434/v1
TEKAI_API_KEY=
TEKAI_MODEL=llama3.2
```

The provider layer lives in `app/lib/ai/` — adding a new provider means adding
one class and one line in `app/lib/ai/provider.ts`; the TeKAI UI does not change.
