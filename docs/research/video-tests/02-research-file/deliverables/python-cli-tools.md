# Python CLI Tools: uv vs pipx

Both `uv` and `pipx` run Python command-line tools in dedicated virtual environments, preventing dependency conflicts across system and user packages.

| Feature | `uv` (`uvx` / `uv tool`) | `pipx` |
| :--- | :--- | :--- |
| **Dependency Isolation** | Creates isolated temporary virtual environments for one-off runs (`uvx`); persistent environments for installed tools (`uv tool install`). | Creates isolated temporary virtual environments for one-off runs (`pipx run`); persistent environments for installed tools (`pipx install`). |
| **One-off Ruff Command** | `uvx ruff` (or `uv tool run ruff`) | `pipx run ruff` |

### Sources
- [Astral uv Tools Guide](https://docs.astral.sh/uv/guides/tools/)
- [pipx Documentation](https://pipx.pypa.io/stable/)
