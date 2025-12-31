#!/bin/sh
# Wrapper script to retrieve device configuration via SSH

IP_ADDRESS="$1"
SSH_USER="$2"
SSH_PASSWORD="$3"
CONFIG_CMD="$4"

# Create expect script dynamically
cat > /tmp/expect_script.exp <<'EOF'
#!/usr/bin/expect -f
set timeout 40
set ip $::env(IP_ADDRESS)
set user $::env(SSH_USER)
set password $::env(SSH_PASSWORD)
set cmd $::env(CONFIG_CMD)

spawn sshpass -p "$password" ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o KexAlgorithms=+diffie-hellman-group1-sha1 -o HostKeyAlgorithms=ssh-rsa $user@$ip

# First, handle the banner and "Press any key" prompt
expect {
    "Press any key to continue" {
        send " \r"
        exp_continue
    }
    "#" {
        # We got the prompt, disable paging first
        send "terminal length unlimited\r"
        expect "#"
        # Now execute the config command
        send "$cmd\r"
        # Wait for output - collect all lines until we get the prompt back
        expect {
            "#" {
                # Got the prompt back, we have all the output
                send "exit\r"
                expect eof
            }
            timeout {
                # Even if timeout, send exit and capture what we have
                send "exit\r"
                expect eof
            }
        }
    }
    ">" {
        # Alternative prompt (user mode)
        send "$cmd\r"
        expect {
            ">" {
                send "exit\r"
                expect eof
            }
            timeout {
                send "exit\r"
                expect eof
            }
        }
    }
    timeout {
        puts "ERROR: Timeout waiting for device"
        exit 1
    }
    eof {
        exit 0
    }
}
EOF

# Export environment variables for expect script
export IP_ADDRESS
export SSH_USER
export SSH_PASSWORD
export CONFIG_CMD

# Run expect script
expect /tmp/expect_script.exp
