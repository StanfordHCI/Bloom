import subprocess
import os
import logging
import signal
import sys
import argparse
import threading
from dotenv import load_dotenv

# Define commands
firebase_commands = ['docker compose up --build --force-recreate']
backend_commands = ['python backend/main.py']
ios_commands = ['yarn ios']

# Setup argparse
parser = argparse.ArgumentParser(description="Run multiple commands in parallel.")
parser.add_argument('build', choices=['local', 'device', 'production'], help="Build environment: local, device, or production")
parser.add_argument('-i', '--interactive', action='store_true', help='Run each command in a new terminal window/tab')

# Parse arguments from .env files
args = parser.parse_args()

env_file = f".env.{args.build}"
if not os.path.isfile(env_file):
    sys.exit(f"Environment file '{env_file}' not found for build '{args.build}'")
load_dotenv(env_file)

os.environ['APP_ENV'] = args.build

# Set ENVFILE for iOS build command: this is used by react-native-config to load the correct .env file
if args.build == "local":
    ios_commands = ['export ENVFILE=.env.local'] + ios_commands
elif args.build == "device":
    ios_commands = ['export ENVFILE=.env.device'] + ios_commands
elif args.build == "production":
    ios_commands = ['export ENVFILE=.env.production'] + ios_commands

# Parse configuration for iOS build command: using simulator or device
use_firebase_emulator = os.getenv("USE_FIREBASE_EMULATOR", "false").lower() == "true"
simulator_name = os.getenv("IOS_SIMULATOR_NAME")
device_id = os.getenv("IOS_DEVICE_ID")

if args.build == "local" and simulator_name:
    ios_commands[-1] += f' --simulator="{simulator_name}"'
elif args.build == "device" and device_id:
    ios_commands[-1] += f' --udid="{device_id}"'
else:
    sys.exit("IOS_SIMULATOR_NAME required for local build or IOS_DEVICE_ID required for device build")

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('build')

processes = []

def run_command(commands, working_dir, session_name, interactive):
    """
    Run a command in a new terminal tab (macOS) or in the current environment.
    Args:
        commands (list[str]): List of commands to run
        working_dir (str): Working directory for the command
        session_name (str): Name of the session
        interactive (bool): True to run the command in a new terminal tab, False to run in the current environment
    """
    try:
        if interactive:
            # Build command with APP_ENV set and open in a new terminal tab
            if any(".py" in command for command in commands):
                commands = [f"conda activate {os.environ['CONDA_ENV']}"] + commands

            abs_working_dir = os.path.abspath(working_dir)
            commands = [f"export APP_ENV={os.environ['APP_ENV']}", f"cd {abs_working_dir}"] + commands

            logger.info(f"{session_name}: Opening new terminal window and running: {commands}")

            commands = [cmd.replace('"', '\\"') for cmd in commands]  # Escape double quotes            
            joined_commands = '\n'.join(commands)

            osascript = f"""
            tell application "Terminal"
                activate
                do script "{joined_commands}"
            end tell
            """            
            
            osascript_command = ["osascript", "-e", osascript]
            subprocess.Popen(osascript_command, shell=False, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, stdin=subprocess.PIPE)
            
        else:
            # Run command in the current environment
            logger.info(f"{session_name}: Running commands: {commands} in {working_dir}")
            full_command = f"export APP_ENV={os.environ['APP_ENV']}; {' && '.join(commands)}"
            process = subprocess.Popen(full_command, cwd=working_dir, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, stdin=subprocess.PIPE)
            processes.append(process)

            for line in iter(process.stdout.readline, b''):
                logger.info(f"{session_name}: {line.decode('utf-8').strip()}")

            process.stdout.close()
            process.wait()
            if process.returncode == 0:
                logger.info(f"{session_name}: Command completed successfully")
            else:
                logger.error(f"{session_name}: Command failed with return code {process.returncode}")
                logger.error(f"{session_name}: {process.stderr.read().decode('utf-8').strip()}")
    
    except Exception as e:
        logger.error(f"{session_name}: Error running command: {e}")


# Handle Keyboard Interrupt (Ctrl+C)
def end_program():
    logger.info("KeyboardInterrupt received. Stopping all processes...")
    for process in processes:
        if process.poll() is None:
            process.terminate()
            logger.info(f"Terminated process {process.pid}")
    sys.exit(0)


logger.info("Starting commands... ")
logger.info(f"Environment: {args.build}")

signal.signal(signal.SIGINT, end_program)

if args.interactive:
    # Each command runs in a new terminal tab, so no threading is required
    if use_firebase_emulator:
        run_command(firebase_commands, "./emulator", 'Firebase', args.interactive)
    
    run_command(backend_commands, ".", 'Backend', args.interactive)
    run_command(ios_commands, ".", 'iOS', args.interactive)
else:
    # Run each command in a separate thread
    threads = []
    
    if use_firebase_emulator:
        firebase_thread = threading.Thread(target=run_command, args=(firebase_commands, "./emulator", 'Firebase', args.interactive))
        firebase_thread.start()
        threads.append(firebase_thread)
    
    backend_thread = threading.Thread(target=run_command, args=(backend_commands, ".", 'Backend', args.interactive))
    backend_thread.start()
    threads.append(backend_thread)

    ios_thread = threading.Thread(target=run_command, args=(ios_commands, ".", 'iOS', args.interactive))
    ios_thread.start()
    threads.append(ios_thread)

    for thread in threads:
        thread.join()

logger.info("All commands completed")