#!/bin/sh
# SSH configuration retrieval with pagination handling
# Uses a Python-based expect-like approach for better output capturing

IP_ADDRESS="$1"
SSH_USER="$2"
SSH_PASSWORD="$3"
CONFIG_CMD="$4"

# Use sshpass with batch mode and terminal settings
# The key is to set terminal width before running the command
(
  # Wait for prompt
  sleep 1
  
  # Try to disable pagination (may fail, but we'll continue anyway)
  echo "terminal length 0" 
  sleep 0.2
  
  # Execute the actual command
  echo "$CONFIG_CMD"
  
  # Give time for output
  sleep 5
  
  # Exit
  echo "exit"
  
) | sshpass -p "$SSH_PASSWORD" ssh \
  -o ConnectTimeout=5 \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  -o KexAlgorithms=+diffie-hellman-group1-sha1 \
  -o HostKeyAlgorithms=ssh-rsa \
  -T \
  "$SSH_USER@$IP_ADDRESS" 2>&1 | while IFS= read -r line; do
  # Filter out error messages and prompts
  case "$line" in
    *"Invalid input"*) continue ;;
    *"^"*) continue ;;
    *"%"*"Invalid"*) continue ;;
    *"terminal length"*) continue ;;
    *"KAT_SW#"*) continue ;;
    *) echo "$line" ;;
  esac
done

exit 0
