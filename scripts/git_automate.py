import subprocess
import sys
import os
import re

def run_cmd(args):
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error running {' '.join(args)}: {result.stderr.strip()}")
        sys.exit(1)
    return result.stdout.strip()

def main():
    if len(sys.argv) < 3:
        print("Usage: python git_automate.py <branch_name> <commit_message>")
        sys.exit(1)
        
    branch_name = sys.argv[1]
    commit_msg = sys.argv[2]
    
    # Simple regex sanitization for branch names
    branch_name = re.sub(r"[^a-zA-Z0-9_\-\/]", "", branch_name)
    
    print(f"\n[GitAuto] Starting Git automation workflow...")
    
    # 1. Check if we have modified/untracked files
    status = run_cmd(["git", "status", "--porcelain"])
    if not status:
        print("[GitAuto] No changes detected in the workspace. Aborting git commit.")
        sys.exit(0)

    # 2. Check out new branch
    print(f"[GitAuto] Creating and checking out branch: '{branch_name}'...")
    try:
        run_cmd(["git", "checkout", "-b", branch_name])
    except SystemExit:
        # If branch already exists, try checking it out directly
        run_cmd(["git", "checkout", branch_name])
    
    # 3. Stage all modified and untracked files
    print("[GitAuto] Staging workspace files...")
    run_cmd(["git", "add", "."])
    
    # 4. Commit changes
    print(f"[GitAuto] Committing changes: \"{commit_msg}\"...")
    run_cmd(["git", "commit", "-m", commit_msg])
    
    # 5. Push to GitHub remote
    print(f"[GitAuto] Pushing branch '{branch_name}' to remote origin...")
    run_cmd(["git", "push", "-u", "origin", branch_name])
    
    # 6. Generate the dynamic GitHub Pull Request URL
    remote_url = run_cmd(["git", "config", "--get", "remote.origin.url"])
    
    # Convert HTTPS or SSH git urls to standard web urls
    # e.g., git@github.com:username/repo.git OR https://github.com/username/repo.git
    web_url = remote_url
    if remote_url.startswith("git@"):
        web_url = remote_url.replace("git@github.com:", "https://github.com/").replace(".git", "")
    elif remote_url.endswith(".git"):
        web_url = remote_url[:-4]
        
    pr_url = f"{web_url}/compare/{branch_name}"
    
    print("\n" + "="*70)
    print("SUCCESS: Changes committed and pushed to GitHub remote!")
    print(f"- Branch: {branch_name}")
    print(f"- Commit: {commit_msg}")
    print(f"\nClick this link to create your Pull Request on GitHub:")
    print(pr_url)
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
