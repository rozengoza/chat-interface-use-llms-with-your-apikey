# ARC — Claude Chat Interface

A clean, self-hostable chat interface powered by the Anthropic API. Built with session-based history, multi-chat management, model switching, and file attachments.

🔗 **Live Demo:** [arc-lime.vercel.app](https://arc-lime.vercel.app/)
> Try it out — sign up with username `guest` to explore.

---

## Why ARC exists?

> **Claude Pro is $20/month. The API is pay-per-token. If you're a developer who already has an Anthropic API key — you're very likely overpaying.**

ARC is a clean chat UI that plugs straight into your API key. No subscription. No monthly commitment. You pay exactly for what you use, nothing more.

It exists for one specific moment: you're deep in a debugging session, Claude's free tier cuts off, and you don't want to context-switch or wait for the limit to reset. You just want to keep going.

Claude is the best coding AI I've used. It doesn't just fix the line you pointed at — it explains what was wrong three decisions ago. For developers across any stack, nothing else is close.

---

### Who this is for

→ Devs with an API key who don't want to pay $20/month for a chat UI  
→ Anyone who hits free limits mid-work and wants to just continue  
→ Developers who want full API access — longer context, no rate limits, custom prompts  

### Who this is not for

→ Non-developers/developers without an API key  
→ Heavy daily users where Pro pricing actually makes sense  

---

### On Security

> Your key is entered in the browser and calls Anthropic's API directly. It never touches any server I own. It's never stored anywhere. It dies when you close the tab.

The code is fully open source — open DevTools, watch the network tab, every request goes to `api.anthropic.com` and nowhere else. **You don't have to trust me. That's the point.**

---

Open source. MIT. Self-hostable in 3 commands.  
🔗 **Live Demo:** [arc-lime.vercel.app](https://arc-lime.vercel.app/) — sign in with username `guest`  

Feedback welcome — especially from the skeptics.

---

## Features

- 💬 **Session-based chat history** — conversations persist across sessions
- 🔀 **Chat switching** — manage and switch between multiple conversations
- 🤖 **Model selection** — choose between `claude-sonnet-4-6` and `claude-haiku-3-5`
- 📎 **Attachments** — send images and files alongside your messages
- 👤 **User accounts** — sign up and keep your chats tied to your profile

---

## How the API Key Works

> 🔐 **Your API key is never stored anywhere.**

When you open the app, you enter your [Anthropic API key](https://console.anthropic.com/) directly in the browser. It lives only in memory for that session — it is never sent to a server, written to a database, or persisted in any way. Closing the tab clears it entirely.

This means:
- You are always in control of your own key
- The app can be deployed publicly without any risk of key exposure
- Each user brings and manages their own Anthropic API key

---

## Self-Hosting

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/rozengoza/arc.git
cd arc

# 2. Install dependencies
npm install

# 3. Run the development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root of the project to configure allowed usernames:

```env
VITE_ALLOWED_USER_1=guest
# VITE_ALLOWED_USER_2=yourname
# Add more as needed
```

> The API key is **not** an environment variable — it is entered by each user at runtime and never stored.

---

## Deploy to Vercel

The easiest way to deploy your own instance:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rozengoza/claude-chat-interface-make-chats-with-your-apikey.git)

1. Fork this repository
2. Import it into [Vercel](https://vercel.com/)
3. Set your `VITE_ALLOWED_USER_*` variables in the Vercel project settings
4. Deploy — users will enter their own API keys when they open the app

---

## Models Available

| Model | Description |
|---|---|
| `claude-sonnet-4-6` | Powerful and balanced — great for most tasks |
| `claude-haiku-4-5` | Fast and lightweight — ideal for quick queries |

---

## Preview

<img width="1687" height="912" alt="image" src="https://github.com/user-attachments/assets/18956cc2-96e0-4c80-b172-3b10f9a582ec" />


---

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](./LICENSE) for details.

---

## Acknowledgements

- Built on top of the [Anthropic API](https://www.anthropic.com/)
- Inspired by the simplicity Claude deserves
