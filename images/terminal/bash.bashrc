# Linux Agent Workbench terminal image.
# The policy gate (preexec hook) is added here in Milestone 4.
if [ -n "$PS1" ]; then
  PS1='\[\e[1;34m\]agent@law\[\e[0m\]:\[\e[1;36m\]\w\[\e[0m\]\$ '
  export HISTFILE=/tmp/.bash_history
fi
