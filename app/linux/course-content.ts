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
  notes: string[];
  codeExamples: LinuxCodeExample[];
  quiz: LinuxQuizQuestion[];
  lab: LinuxLabAssignment;
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
];