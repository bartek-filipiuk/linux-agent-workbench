# Linux Agent Workbench terminal image.
if [ -n "$PS1" ]; then
  PS1='\[\e[1;34m\]agent@law\[\e[0m\]:\[\e[1;36m\]\w\[\e[0m\]\$ '
  export HISTFILE=/tmp/.bash_history
  # Policy gate: every simple command of this interactive shell is checked by agentd before it runs.
  # Ceiling: bash -c, scripts, other shells and nested agents' own processes are not covered; the
  # container, mounts and network profile are the boundary for those.
  if [ -S /run/law/gate.sock ]; then
    shopt -s extdebug
    __law_gate() { node /opt/law/gate.js "$BASH_COMMAND" || return 1; }
    trap '__law_gate' DEBUG
  fi
fi
