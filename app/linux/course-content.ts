export type LinuxQuizQuestion = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

export type LinuxLabAssignment = {
  title: string;
  instructions: string;
  expectedCommand: string;
  expectedOutput: string;
  hint: string;
};

export type LinuxCodeExample = {
  label: string;
  command: string;
};

export type LinuxModule = {
  id: string;
  title: string;
  summary: string;
  topics: string[];
  objectives?: string[];
  notes: string[];
  codeExamples: LinuxCodeExample[];
  quiz: LinuxQuizQuestion[];
  lab: LinuxLabAssignment;
  challenge?: { prompt: string; solution: string };
};

export const linuxModules: LinuxModule[] = [
  {
    id: "filesystem",
    title: "Module 1: Directory Manipulation & Core Concepts",
    summary: "Build a reliable mental model of the Linux tree, paths, and directory navigation.",
    topics: ["Filesystem hierarchy", "Absolute and relative paths", "cd, ls, pwd", "Hidden files"],
    codeExamples: [
      { label: "Show the current directory", command: "pwd" },
      { label: "List files, including hidden entries", command: "ls -la /home/learner" },
      { label: "Move to the system log directory", command: "cd /var/log" },
    ],
    notes: [
      "Linux presents files beneath one root directory, `/`. Directories such as `/etc`, `/var`, `/home`, `/tmp`, and `/proc` have conventional purposes; `/home/learner` is the simulated user workspace. A mount can attach another filesystem at a directory without changing the single-tree view.",
      "An absolute path starts at `/`, for example `/var/log/auth.log`. A relative path is interpreted from the current working directory: `notes/today.txt` is different depending on where the shell is. `.` means the current directory and `..` its parent; repeated `..` components cannot escape the lab root in this simulator.",
      "`pwd` prints the shell's current working directory. `cd` changes it; with no operand it returns to the learner home. `ls` lists entries, while `ls -a` includes names beginning with `.` and `ls -l` requests metadata such as type, mode, owner, size, and modification time.",
      "A leading dot is a naming convention for hidden entries, not an access-control mechanism. Hidden files still appear when their exact path is known, and permissions still determine access. Do not infer that a hidden configuration file is secret or protected.",
    ],
    quiz: [
      { question: "Which is an absolute path?", options: ["../logs", "notes/today.txt", "/var/log/auth.log", "./Downloads"], answer: 2, explanation: "An absolute path begins at the root directory `/`." },
      { question: "Which option asks `ls` to include dot-prefixed entries?", options: ["-r", "-a", "-t", "-h"], answer: 1, explanation: "`ls -a` includes entries whose names begin with a dot." },
    ],
    lab: {
      title: "Navigate to the system log directory",
      instructions: "Use an absolute path to move into `/var/log`, then verify the working directory.",
      expectedCommand: "pwd",
      expectedOutput: "/var/log",
      hint: "Run `cd /var/log` first, then run `pwd`.",
    },
  },
  {
    id: "files",
    title: "Module 2: File Creation & Mutation Engines",
    summary: "Create, inspect, copy, move, link, and remove files while reasoning about destructive operations.",
    topics: ["touch and mkdir", "rm, cp, mv", "Hard links and symbolic links", "cat, less, head, tail"],
    codeExamples: [
      { label: "Create a file", command: "touch draft.txt" },
      { label: "Create nested directories", command: "mkdir -p archive/2026" },
      { label: "Copy a file", command: "cp notes.txt archive/notes.txt" },
      { label: "Create a symbolic link", command: "ln -s notes.txt notes-link.txt" },
      { label: "Read the last five log lines", command: "tail -n 5 /var/log/auth.log" },
    ],
    notes: [
      "`touch` creates an empty file when the path does not exist and updates timestamps when it does. `mkdir` creates a directory; `mkdir -p` creates missing parents and is idempotent for existing directories.",
      "`cp` copies data to a destination; `mv` renames a path or moves it to another directory. `rm` removes directory entries, and recursive removal can erase entire trees. Check the exact path with `pwd` and `ls` before any removal. The mock terminal requires explicit paths and cannot touch host files.",
      "A hard link is another directory entry for the same inode-like object and normally cannot cross filesystem boundaries. A symbolic link stores a path to another object; it can cross filesystems and can become dangling if its target moves. This lab simulator models both link types without touching the host filesystem.",
      "`cat` writes a file to standard output and is useful for short content. `less` pages through longer content; `head` and `tail` show the first or last lines. `tail -f` follows appended content in a real shell; the simulator presents a finite snapshot instead of a persistent process.",
    ],
    quiz: [
      { question: "Which command creates an empty file if it does not already exist?", options: ["touch", "tail", "mv", "less"], answer: 0, explanation: "`touch` creates an empty file and updates a file's timestamp." },
      { question: "What should you do before a recursive removal?", options: ["Use sudo automatically", "Check the current directory and exact target path", "Hide the directory", "Create a symbolic link"], answer: 1, explanation: "Confirming the working directory and target prevents accidental destructive operations." },
    ],
    lab: {
      title: "Create and verify a lab note",
      instructions: "Create `module2-note.txt` in your home directory, then list that exact file to verify it exists.",
      expectedCommand: "ls module2-note.txt",
      expectedOutput: "module2-note.txt",
      hint: "Use `touch module2-note.txt` followed by `ls module2-note.txt`.",
    },
  },
  {
    id: "pipelines",
    title: "Module 3: Advanced Pipeline Processing",
    summary: "Compose small text tools using streams, redirection, and pipelines.",
    topics: ["stdin, stdout, stderr", "<, >, >> redirection", "Pipes", "grep, awk, sed, sort, uniq"],
    codeExamples: [
      { label: "Filter and count failed log entries", command: "grep -i failed /var/log/auth.log | sort | uniq -c" },
      { label: "Read a file through standard input", command: "sort < /var/log/auth.log" },
      { label: "Print usernames from a colon-separated file", command: "awk -F: '{print $1}' /etc/passwd" },
      { label: "Append a line to a virtual file", command: "echo review-complete >> notes.txt" },
    ],
    notes: [
      "Unix-style programs commonly read standard input (stdin), write normal results to standard output (stdout), and send diagnostics to standard error (stderr). Redirection changes where a stream goes; it does not change the meaning of the command that produced it.",
      "`< file` supplies a file as stdin. `> file` creates or truncates a destination before writing; `>> file` appends. A mistaken `>` can destroy existing content, so inspect the target first. In this lab environment, redirection only writes inside the virtual filesystem.",
      "A pipe (`|`) connects the stdout of one process to the stdin of the next. Pipelines encourage composable steps: select matching lines, transform fields, sort, then count adjacent duplicates. Errors on stderr do not automatically become pipeline input.",
      "`grep` selects lines matching a pattern; `awk` can print delimited fields; `sed` performs stream edits such as a constrained substitution. `sort` orders lines. `uniq` only combines adjacent duplicate lines, so `sort` is usually placed before `uniq -c` when counting all occurrences.",
      "Quote patterns that contain spaces or shell metacharacters. Real shells have rich quoting and expansion rules; this simulator intentionally supports a limited grammar and rejects command substitution, arbitrary shell scripts, and unsupported operators.",
    ],
    quiz: [
      { question: "What does `>> file` do?", options: ["Reads from file", "Appends output to file", "Truncates file first", "Sends output to stderr"], answer: 1, explanation: "`>>` appends output; `>` truncates or creates a file before writing." },
      { question: "Why is `sort` commonly used before `uniq -c`?", options: ["uniq only combines adjacent duplicate lines", "sort turns stderr into stdout", "uniq requires alphabetical input", "sort creates a pipe"], answer: 0, explanation: "Sorting groups identical lines together so `uniq -c` can count them." },
    ],
    lab: {
      title: "Count failed authentication events",
      instructions: "Use the provided sample log to find failed-password events, then sort and count repeated lines.",
      expectedCommand: "grep -i failed /var/log/auth.log | sort | uniq -c",
      expectedOutput: "Failed password",
      hint: "Build the pipeline in order: `grep -i failed /var/log/auth.log | sort | uniq -c`.",
    },
  },
  {
    id: "identity",
    title: "Module 4: System Identity & Permission Matrix",
    summary: "Understand account identity, ownership, permission bits, and controlled privilege boundaries.",
    topics: ["Users, groups, and IDs", "Ownership mappings", "chmod octal and symbolic modes", "chown, chgrp, sudo"],
    codeExamples: [
      { label: "Set owner read/write and group read", command: "chmod 640 secure.txt" },
      { label: "Add execute for the file owner", command: "chmod u+x notes.txt" },
      { label: "Inspect the current simulated identity", command: "id" },
      { label: "Change the group in the virtual lab", command: "chgrp learner notes.txt" },
    ],
    notes: [
      "A process acts with a user identity (UID) and group identities (GIDs). Files record an owner and group; access checks compare the process credentials with owner, group, then other permission classes. `id` and `whoami` help inspect the current identity in a real system.",
      "The familiar `rwx` bits mean read, write, and execute. For a regular file, read permits reading contents, write permits changing contents, and execute permits running it subject to other controls. For directories, read lists names, write changes directory entries, and execute permits traversal/search.",
      "Octal modes encode each class as a sum: read is 4, write is 2, execute is 1. Thus `640` means owner `rw-`, group `r--`, other `---`; `750` means owner `rwx`, group `r-x`, other `---`. Symbolic changes such as `chmod u+x script.sh` add execute for the owner without replacing unrelated bits.",
      "`chown` changes owner and optionally group; `chgrp` changes group. These operations are privileged on many systems. `sudo` is a controlled elevation mechanism, not a blanket safety check: use a narrowly scoped policy, inspect the command, and avoid running untrusted files as an administrator. Elevation is intentionally unavailable in this simulator.",
    ],
    quiz: [
      { question: "What permission does the octal digit 5 represent?", options: ["Write and execute", "Read and execute", "Read and write", "Read only"], answer: 1, explanation: "5 is 4 + 1: read plus execute." },
      { question: "In `chmod u+x script.sh`, what does `u+x` mean?", options: ["Remove execute from others", "Add execute for the owner", "Set every class to execute only", "Change the file owner"], answer: 1, explanation: "`u` selects the owner class, `+` adds a bit, and `x` is execute." },
    ],
    lab: {
      title: "Apply a least-privilege mode",
      instructions: "Set the provided `secure.txt` file to mode 640 and verify the resulting mode.",
      expectedCommand: "chmod 640 secure.txt",
      expectedOutput: "Mode set to 640",
      hint: "Use `chmod 640 secure.txt`; this modifies only the virtual lab file.",
    },
  },
  {
    id: "processes",
    title: "Module 5: Process Control & Diagnostics",
    summary: "Inspect jobs and processes, interpret signals, and manage simulated background work.",
    topics: ["Jobs and process states", "ps, top, htop", "kill and killall", "&, jobs, bg, fg"],
    codeExamples: [
      { label: "Inspect the mock process list", command: "ps" },
      { label: "Gracefully stop the lab worker", command: "kill 2345" },
      { label: "List simulated shell jobs", command: "jobs" },
      { label: "View the process snapshot", command: "top" },
    ],
    notes: [
      "A process is a running program with a PID and credentials. `ps` provides a snapshot; `top` and `htop` present changing resource and process views in interactive tools. A process list is evidence at one point in time, not a complete history.",
      "Shell jobs are commands started by the current shell. `&` starts a job asynchronously, `jobs` lists tracked jobs, `fg` brings a job to the foreground, and `bg` resumes a stopped job in the background. Job-control state differs from the process state shown by system monitoring tools.",
      "`kill PID` sends a signal (normally TERM), requesting graceful shutdown; `kill -9 PID` sends KILL and prevents cleanup. Prefer graceful termination, confirm the PID, and avoid signaling critical services. The simulator protects its init process and only tracks mock processes.",
      "`killall name` selects processes by name and can affect more than one process. Verify the name and scope before using it. `top`/`htop` are for observation; they do not make a process safe to stop.",
    ],
    quiz: [
      { question: "What does `kill PID` normally request by default?", options: ["Immediate uncatchable termination", "A graceful termination signal", "A restart", "A background resume"], answer: 1, explanation: "The default signal is TERM, allowing a process to shut down cleanly." },
      { question: "Which command brings a shell job to the foreground?", options: ["jobs", "bg", "fg", "ps"], answer: 2, explanation: "`fg` places a job in the foreground; `bg` resumes a stopped job in the background." },
    ],
    lab: {
      title: "Stop a mock background worker",
      instructions: "Inspect the simulated process list and gracefully terminate the worker with PID 2345.",
      expectedCommand: "kill 2345",
      expectedOutput: "Process 2345 terminated (simulation)",
      hint: "Run `ps` to inspect the mock list, then `kill 2345`. The simulator never signals host processes.",
    },
  },
  {
    id: "networking",
    title: "Module 6: Network Interface Inspection",
    summary: "Inspect local interfaces, routing, reachability, listening sockets, and a strictly simulated scan.",
    topics: ["ip addr and ifconfig", "ping and routes", "netstat and ss", "nmap fundamentals"],
    codeExamples: [
      { label: "Inspect interface addresses", command: "ip addr" },
      { label: "Inspect the route table", command: "ip route" },
      { label: "List listening sockets", command: "ss -tuln" },
      { label: "Ping the fixed lab host", command: "ping 192.0.2.20" },
      { label: "Scan the fixed documentation-only mock host", command: "nmap 192.0.2.20" },
    ],
    notes: [
      "`ip addr` is the modern Linux interface/address inspection command. `ifconfig` is a legacy utility that may not be installed. Loopback (`lo`) is local to the host; an interface such as `eth0` carries traffic to an attached network. Link state and address assignment are separate facts.",
      "`ping` sends ICMP echo requests to test reachability and round-trip timing; lack of a reply does not prove a host is down because ICMP may be filtered. `ip route` or `route -n` shows routing decisions. A default route is used when no more-specific route matches.",
      "`ss -tuln` reports listening TCP/UDP sockets numerically; `netstat -tuln` is a legacy equivalent on many systems. A listening socket indicates a local service endpoint, not necessarily that it is reachable through a firewall or from every network.",
      "`nmap` can discover hosts and services, but scanning requires authorization and scope. This course engine does not send packets: it returns fixed sample results only for RFC 5737 documentation targets `192.0.2.20` and `192.0.2.53`. Any other target is rejected; never use the lab simulator as permission to scan a real system.",
    ],
    quiz: [
      { question: "Which command is the modern interface/address inspection tool?", options: ["ip addr", "chmod", "uniq", "killall"], answer: 0, explanation: "`ip addr` inspects network interfaces and their addresses; `ifconfig` is a legacy alternative." },
      { question: "What does a listening socket prove?", options: ["That the service is reachable from the internet", "That a local service endpoint is listening", "That a firewall permits every client", "That a host is uncompromised"], answer: 1, explanation: "A listening socket is local state; reachability depends on routing, filtering, and other controls." },
    ],
    lab: {
      title: "Inspect the isolated documentation host",
      instructions: "Use the simulator's fixed lab target to identify its sample open services. Only the documented mock host is accepted.",
      expectedCommand: "nmap 192.0.2.20",
      expectedOutput: "80/tcp open",
      hint: "Run `nmap 192.0.2.20`. Only this documentation-only simulated endpoint is in scope.",
    },
  },
  {
    id: "fundamentals",
    title: "Module 7: Linux Fundamentals & Distributions",
    summary: "Understand Linux, distributions, and the basic shape of a command-line session.",
    topics: ["Linux kernel and operating system", "Ubuntu, Kali, and Fedora", "Terminal anatomy", "Commands and arguments"],
    codeExamples: [
      { label: "Identify the operating system", command: "uname -s" },
      { label: "Inspect the lab host name", command: "hostname" },
      { label: "Read a command's help", command: "help" },
    ],
    notes: [
      "Linux is the kernel used by a family of operating systems. The kernel coordinates hardware, memory, processes, filesystems, and networking; the surrounding tools and applications make a complete system.",
      "A distribution packages the Linux kernel with user-space utilities, libraries, a package manager, and a release process. Ubuntu, Kali Linux, and Fedora are distributions with different audiences and defaults; Kali is purpose-built for authorized security work, not a shortcut around permission or scope.",
      "A terminal is the text interface; a shell reads commands and arguments. In `ls -la /home/learner`, `ls` is the command, `-la` are options, and the path is an argument. `pwd`, `ls`, and `cd` are useful first steps for orientation.",
      "A path is absolute when it begins with `/`; otherwise it is resolved from the current directory. The simulator provides a virtual filesystem and never runs commands on the computer hosting this page.",
    ],
    quiz: [
      { question: "What is a Linux distribution?", options: ["A packaged operating system built around the Linux kernel", "A terminal command", "A file permission", "A network route"], answer: 0, explanation: "A distribution combines the kernel with tools, libraries, applications, and release conventions." },
      { question: "Which command prints the current directory?", options: ["ls", "pwd", "cd", "id"], answer: 1, explanation: "`pwd` prints the shell's current working directory." },
    ],
    lab: {
      title: "Identify the simulated operating system",
      instructions: "Use the operating-system information command and confirm its result.",
      expectedCommand: "uname -s",
      expectedOutput: "Linux",
      hint: "Run `uname -s` in the simulated terminal.",
    },
  },
  {
    id: "advanced-permissions",
    title: "Module 8: Permission Bits & Identity",
    summary: "Read permission notation and reason about ownership, umask, and special bits.",
    topics: ["Users and groups", "chmod and chown", "umask", "SUID, SGID, sticky bit"],
    codeExamples: [
      { label: "Inspect the current identity", command: "id" },
      { label: "Read the current umask", command: "umask" },
      { label: "Inspect a file's mode and owner", command: "stat secure.txt" },
      { label: "Set owner-only access", command: "chmod 600 secure.txt" },
    ],
    notes: [
      "Linux checks access using a process's user and group identities. For a file, the owner, owning group, and everyone else are checked in that order; `id` displays the current simulated identity.",
      "Permission digits add read (4), write (2), and execute (1): `640` is owner `rw-`, group `r--`, others `---`. Symbolic forms such as `chmod u+x script.sh` change selected bits without replacing the rest.",
      "`umask` removes permissions from the defaults requested when new files and directories are created. A umask of `027` removes group write and all access for others; it does not change existing files.",
      "The leading special mode digit represents SUID (4), SGID (2), and sticky (1). Their meaning depends on file type and context. SUID/SGID can change execution identity, while sticky directories restrict who can remove entries; treat these bits as sensitive and audit them rather than setting them casually.",
      "`chown` changes ownership and often requires administrative privilege. This simulator models ownership and mode changes only in its virtual filesystem; `sudo` stays disabled.",
    ],
    quiz: [
      { question: "What does mode 640 grant to the group?", options: ["Read only", "Read and write", "Execute only", "No access"], answer: 0, explanation: "The middle digit is 4, which grants read only." },
      { question: "What does umask control?", options: ["Default permission bits removed from newly created items", "Ownership of existing files", "The active user", "Running services"], answer: 0, explanation: "Umask masks requested permissions during creation; it does not rewrite existing modes." },
    ],
    lab: {
      title: "Inspect a restrictive file mode",
      instructions: "Read the mode and owner of the virtual secret file, then apply a least-privilege mode if needed.",
      expectedCommand: "stat secure.txt",
      expectedOutput: "600",
      hint: "Run `stat secure.txt`. The virtual file starts owner-readable and owner-writable only.",
    },
  },
  {
    id: "services-admin",
    title: "Module 9: Services, Logs & Administration",
    summary: "Inspect simulated systemd services, logs, scheduled jobs, and package state.",
    topics: ["systemd service status", "journal logs", "Cron", "Package management and troubleshooting"],
    codeExamples: [
      { label: "Inspect the SSH service", command: "systemctl status sshd" },
      { label: "Review SSH service events", command: "journalctl -u sshd" },
      { label: "List the learner's scheduled jobs", command: "crontab -l" },
      { label: "Review installed lab packages", command: "apt list --installed" },
    ],
    notes: [
      "systemd is a common Linux init and service manager. `systemctl status NAME` inspects a unit; starting, stopping, or enabling a service changes system state and should follow change-control and least-privilege practices.",
      "Logs under `/var/log` and the system journal provide evidence for troubleshooting. Establish a time window, identify the relevant service, compare related events, and avoid treating one log line as proof of a cause.",
      "Cron schedules recurring commands. Review the owner, command, environment, output, and permissions of each job; avoid placing secrets in broadly readable crontabs. This lab only displays a fictional learner crontab.",
      "Package tools such as apt and dnf install signed packages from configured repositories. Confirm the source and change impact before updates; package commands in this exercise only inspect fictional package state and never modify the host.",
      "A basic troubleshooting sequence is to identify the symptom and scope, inspect service state and recent logs, check resources and network configuration, make one authorized change, then verify and document the result.",
    ],
    quiz: [
      { question: "What does `systemctl status sshd` do in this lab?", options: ["Shows simulated service state", "Connects to a remote server", "Installs an SSH server", "Changes the host service"], answer: 0, explanation: "The lab command returns fixed simulated service state only." },
      { question: "What is a good first step when reviewing an unexpected log event?", options: ["Correlate time, service, and surrounding events", "Delete the log", "Assume the first line proves the cause", "Disable all services"], answer: 0, explanation: "Time and surrounding context help distinguish signal from incomplete evidence." },
    ],
    lab: {
      title: "Check the simulated SSH service",
      instructions: "Inspect service status and confirm whether the fictional service is running.",
      expectedCommand: "systemctl status sshd",
      expectedOutput: "active (running)",
      hint: "Run `systemctl status sshd`. Service status is a read-only fixture in this lab.",
    },
  },
  {
    id: "network-tools",
    title: "Module 10: DNS, HTTP & Remote Access",
    summary: "Practice common network diagnostics against documentation-only simulated fixtures.",
    topics: ["DNS lookups", "curl and wget", "SSH concepts", "Interfaces and routing"],
    codeExamples: [
      { label: "Resolve the lab-only example name", command: "getent hosts example.test" },
      { label: "Fetch a fixed lab page", command: "curl https://example.test/" },
      { label: "Inspect a lab route", command: "ip route" },
      { label: "Inspect listening sockets", command: "ss -tuln" },
    ],
    notes: [
      "DNS maps names to records used to locate services. A lookup result depends on the resolver and its cache; investigate unexpected responses using approved resolvers and trusted telemetry.",
      "`curl` transfers data using a URL and `wget` retrieves resources. In this simulation, requests resolve only to fixed example fixtures and never make network connections. Real use should verify the destination, certificate, and data handling.",
      "SSH provides an encrypted remote session after a client verifies the server and authenticates the user. Protect private keys and verify host keys; only connect to systems where you have explicit authorization.",
      "`ip addr` shows local interface addressing and `ip route` shows routing decisions. `ss -tuln` shows local listening sockets; it does not prove that a service is reachable through a firewall.",
    ],
    quiz: [
      { question: "What does a DNS lookup help determine?", options: ["Records associated with a domain name", "File ownership", "A process ID", "The current directory"], answer: 0, explanation: "DNS returns records used to locate services by name." },
      { question: "What does a listening socket tell you?", options: ["A local service endpoint is listening", "The host is secure", "The service is reachable from anywhere", "A route is encrypted"], answer: 0, explanation: "Reachability also depends on routing, filtering, and network policy." },
    ],
    lab: {
      title: "Resolve a fixed example domain",
      instructions: "Look up the reserved example domain and review its simulated documentation address.",
      expectedCommand: "getent hosts example.test",
      expectedOutput: "192.0.2.80",
      hint: "Run `getent hosts example.test`. External names are deliberately not queried.",
    },
  },
  {
    id: "file-search",
    title: "Module 11: Find & Filter Files",
    summary: "Search known virtual paths and inspect data without leaving the simulated filesystem.",
    topics: ["find by name", "grep", "head and tail", "sort, uniq, cut, awk, sed"],
    codeExamples: [
      { label: "Locate the sample authentication log", command: "find /var/log -name auth.log" },
      { label: "Find failed authentication events", command: "grep -i failed /var/log/auth.log" },
      { label: "Read the final log entries", command: "tail -n 2 /var/log/auth.log" },
      { label: "Extract account names", command: "cut -d: -f1 /etc/passwd" },
    ],
    notes: [
      "`find` walks a starting directory and applies predicates such as a name match. Start with a narrow path and exact filename; broad searches can be slow and return sensitive paths on real systems.",
      "`grep` selects matching lines. `head` and `tail` show bounded portions of a file; `sort` orders lines and `uniq` groups adjacent duplicates. Combine tools with a pipe only after checking how each stage treats its input.",
      "`cut` selects delimited fields, `awk` can process records and fields, and `sed` can transform streams. Quoting and delimiters matter; verify output before writing transformed data back over an original.",
      "Use authorized log data and minimize copied sensitive information. All paths and content in this exercise are virtual fixtures.",
    ],
    quiz: [
      { question: "Why give `find` a narrow starting directory?", options: ["To limit scope and irrelevant results", "To enable host access", "To change file ownership", "To skip filename matching"], answer: 0, explanation: "A narrow search root improves relevance and avoids needless inspection." },
      { question: "What does `uniq -c` count?", options: ["Adjacent duplicate lines", "All files in a directory", "Unique users in the system", "Bytes in a file"], answer: 0, explanation: "`uniq` works on adjacent lines, so sorting first is often needed for a full count." },
    ],
    lab: {
      title: "Locate the sample authentication log",
      instructions: "Search the virtual log directory for the provided authentication log file.",
      expectedCommand: "find /var/log -name auth.log",
      expectedOutput: "/var/log/auth.log",
      hint: "Use the simulated `find` form: `find /var/log -name auth.log`.",
    },
  },
  {
    id: "shell-automation",
    title: "Module 12: Shell Automation & Security",
    summary: "Learn environment variables, pipelines, exit status, and safe script structure.",
    topics: ["Variables and environment", "Pipes and redirection", "Exit codes", "Conditions, loops, and functions"],
    codeExamples: [
      { label: "Inspect the simulated environment", command: "env" },
      { label: "Print the learner home variable", command: "printenv HOME" },
      { label: "Filter sample logs through a pipeline", command: "grep -i failed /var/log/auth.log | sort | uniq -c" },
      { label: "Write a safe Bash script skeleton", command: "#!/usr/bin/env bash\nset -eu\nif [[ -r /var/log/auth.log ]]; then\n  grep -i failed /var/log/auth.log | wc -l\nfi" },
    ],
    notes: [
      "Environment variables pass configuration to programs. `env` lists the simulated environment and `printenv NAME` reads one value; avoid placing credentials in shell history, process arguments, or logs.",
      "Pipes connect one command's output to another command's input. `>` replaces a virtual file and `>>` appends; exit status reports success or failure and should be checked before later steps rely on output.",
      "Bash scripts combine commands with variables, conditions, loops, and functions. Quote expansions, validate input, use narrow permissions, and handle errors deliberately. The course displays script examples but does not execute arbitrary scripts.",
      "Administration also includes reviewing `/var/log`, auditing cron jobs, checking package sources, and making one reversible troubleshooting change at a time. Least privilege and backups reduce the impact of mistakes.",
    ],
    quiz: [
      { question: "What does a pipeline connect?", options: ["One command's stdout to the next command's stdin", "Two host filesystems", "A user to a group", "A process to a password"], answer: 0, explanation: "A pipe streams output between commands without requiring an intermediate file." },
      { question: "Why does this lab not run pasted Bash scripts?", options: ["To prevent arbitrary code execution outside the constrained simulator", "Scripts cannot contain conditions", "Bash cannot read files", "Pipelines are unsafe everywhere"], answer: 0, explanation: "The terminal intentionally supports a constrained set of simulated commands and does not execute host code." },
    ],
    lab: {
      title: "Inspect the simulated environment",
      instructions: "List the fixed environment variables provided to the virtual learner session.",
      expectedCommand: "env",
      expectedOutput: "HOME=/home/learner",
      hint: "Run `env`. Values are fixed fixtures and do not expose the browser or host environment.",
    },
  },
  {
    id: "text-toolkit",
    title: "Module 13: Text Processing Toolkit",
    summary: "Filter, sort, count, and reshape text streams with small composable tools.",
    topics: ["grep patterns", "sort and uniq", "cut field extraction", "awk and sed edits"],
    objectives: [
      "Search a file for matching lines with grep.",
      "Sort output and count duplicates with sort and uniq.",
      "Extract a single field from each line with cut.",
    ],
    codeExamples: [
      { label: "Find failed sign-in attempts", command: "grep Failed /var/log/auth.log" },
      { label: "Sort the log lines", command: "sort /var/log/auth.log" },
      { label: "Show the first field of each line", command: "cut -d ' ' -f 1 /var/log/auth.log" },
      { label: "Replace text with sed", command: "sed 's/Failed/BLOCKED/' /var/log/auth.log" },
    ],
    notes: [
      "`grep pattern file` prints the lines that contain a pattern; add `-i` for a case-insensitive match and `-r` to search a directory tree. Piping several filters together is how analysts reduce a large log to the few lines that matter.",
      "`sort` orders lines and `uniq` removes adjacent duplicates; because `uniq` only compares neighbouring lines, sort first when you want a true count. `uniq -c` prefixes each unique line with its count.",
      "`cut -d ' ' -f 1` splits each line on the space delimiter and prints the first field. `awk` and `sed` go further: `awk` selects and reshapes columns, while `sed 's/old/new/'` performs a stream edit without opening an editor.",
      "Text processing turns raw logs into evidence. Confirm you are authorized to read a given log, and treat the output as sensitive.",
    ],
    quiz: [
      { question: "Why sort before running uniq?", options: ["uniq only removes adjacent duplicates", "uniq changes permissions", "sort encrypts the file", "uniq requires a network connection"], answer: 0, explanation: "uniq compares neighbouring lines, so identical lines must be adjacent to be counted or removed." },
      { question: "What does `cut -d ' ' -f 1` do?", options: ["Prints the first space-delimited field of each line", "Deletes the file", "Counts the lines", "Changes the file owner"], answer: 0, explanation: "cut splits each line by the delimiter and prints the requested field." },
    ],
    lab: {
      title: "Find failed logins in the authentication log",
      instructions: "Use grep to print only the lines of `/var/log/auth.log` that contain the word `Failed`.",
      expectedCommand: "grep Failed /var/log/auth.log",
      expectedOutput: "Failed password for learner",
      hint: "Run `grep Failed /var/log/auth.log`. Matching is case-sensitive by default.",
    },
    challenge: {
      prompt: "Challenge: pipe the log through sort and uniq -c to count how many repeated line patterns appear.",
      solution: "Run `sort /var/log/auth.log | uniq -c`. The simulator runs the pipeline on the virtual file only and prints each unique adjacent line with its count.",
    },
  },
  {
    id: "ssh-remote",
    title: "Module 14: SSH & Remote Administration",
    summary: "Understand secure remote access, host verification, and key-based authentication.",
    topics: ["SSH protocol", "Host keys", "Key-based auth", "Remote administration safety"],
    objectives: [
      "Explain what SSH protects and how a session is established.",
      "Recognize why host keys and private keys must be protected.",
      "Simulate a connection to an isolated documentation host.",
    ],
    codeExamples: [
      { label: "Connect to a simulated host", command: "ssh learner@192.0.2.20" },
      { label: "Inspect scheduled jobs", command: "crontab -l" },
      { label: "Read the service logs", command: "journalctl -u sshd" },
    ],
    notes: [
      "SSH (Secure Shell) encrypts a command-line session between a client and a server. The client first verifies the server's host key, then authenticates the user, typically with a public/private key pair rather than a password.",
      "A private key is a secret: protect it with a passphrase and correct file permissions, and never copy it to an untrusted machine. Host-key warnings can indicate a changed server or an interception attempt and should be investigated, not ignored.",
      "Remote administration is powerful, so follow least privilege: use named accounts, restrict which users may log in, disable direct root logins, and monitor authentication logs for unexpected activity.",
      "This module connects only to the isolated documentation addresses 192.0.2.20 and 192.0.2.53. No real network traffic is sent.",
    ],
    quiz: [
      { question: "What does the SSH client verify first?", options: ["The server's host key", "The user's birthday", "The disk size", "The firewall vendor"], answer: 0, explanation: "The client checks the host key before authentication to reduce the chance of connecting to an impersonated server." },
      { question: "Why protect an SSH private key?", options: ["It proves your identity", "It stores your files", "It blocks the firewall", "It speeds up the network"], answer: 0, explanation: "Anyone with the private key can authenticate as you, so it must be kept secret." },
    ],
    lab: {
      title: "Simulate an SSH connection",
      instructions: "Connect the learner user to the isolated documentation host 192.0.2.20.",
      expectedCommand: "ssh learner@192.0.2.20",
      expectedOutput: "192.0.2.20",
      hint: "Run `ssh learner@192.0.2.20`. The simulator prints a connection notice and sends no packets.",
    },
    challenge: {
      prompt: "Challenge: run `crontab -l` and `journalctl -u sshd` to review scheduled jobs and service logs.",
      solution: "Both commands return fixed simulator output describing scheduled jobs and the sshd service, illustrating where an administrator looks for changes.",
    },
  },

  {
    id: "system-health",
    title: "Module 15: System Health & Troubleshooting",
    summary: "Check disk, memory, and load, and reason about a basic Linux incident.",
    topics: ["Disk usage with df", "Memory with free", "Load with uptime", "A troubleshooting method"],
    objectives: [
      "Read disk, memory, and load summaries.",
      "Follow a simple, reversible troubleshooting order.",
      "Recognize output that points to a resource problem.",
    ],
    codeExamples: [
      { label: "Check disk usage", command: "df -h" },
      { label: "Check memory usage", command: "free -h" },
      { label: "Check load and uptime", command: "uptime" },
    ],
    notes: [
      "`df -h` reports filesystem capacity and free space; a filesystem at 100% is a common cause of failing services. `free -h` summarizes memory and swap, and `uptime` shows system load averages over 1, 5, and 15 minutes.",
      "A careful troubleshooting order is: reproduce the problem, gather evidence from logs and resource metrics, form one hypothesis, make one reversible change, and verify. Document each step so the change can be undone.",
      "Load averages above the number of CPU cores can indicate contention. Combine metrics with logs rather than guessing, and confirm that a fix actually restored service.",
    ],
    quiz: [
      { question: "Which command summarizes disk capacity and free space?", options: ["df", "ping", "cd", "sed"], answer: 0, explanation: "df reports filesystem size, used, and available space." },
      { question: "What is a safe first troubleshooting step?", options: ["Gather evidence and reproduce the problem", "Reinstall the operating system", "Delete all logs", "Disable the firewall"], answer: 0, explanation: "Collecting evidence and reproducing the issue prevents guesswork and unnecessary changes." },
    ],
    lab: {
      title: "Read the system load",
      instructions: "Print the system uptime and its load averages.",
      expectedCommand: "uptime",
      expectedOutput: "load average",
      hint: "Run `uptime`. The simulator returns a fixed summary including load averages.",
    },
    challenge: {
      prompt: "Challenge: check `df -h` and `free -h`, then decide which resource a failing web server would most likely exhaust first.",
      solution: "Disk fills gradually and often causes writes and logs to fail first, while memory pressure triggers the out-of-memory killer. Real answers depend on the system, so confirm with metrics and logs.",
    },
  },

];