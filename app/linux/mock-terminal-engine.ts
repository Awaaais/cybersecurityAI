export type MockProcess = { pid: number; name: string; state: "running" | "sleeping" | "stopped"; user: string };
export type MockLink = { target: string; kind: "symbolic" | "hard" };

export type MockTerminalState = {
  cwd: string;
  directories: string[];
  files: Record<string, string>;
  modes: Record<string, string>;
  owners: Record<string, string>;
  links: Record<string, MockLink>;
  umask: string;
  processes: MockProcess[];
  jobs: string[];
  nextPid: number;
};

export type MockCommandResult = {
  state: MockTerminalState;
  output: string;
  error?: string;
  clear?: boolean;
};

const authLog = [
  "Accepted publickey for learner from 192.0.2.45 port 51318 ssh2",
  "Failed password for learner from 192.0.2.45 port 51320 ssh2",
  "Failed password for learner from 192.0.2.45 port 51320 ssh2",
  "Accepted password for operator from 192.0.2.53 port 51322 ssh2",
].join("\n");

export const createMockTerminalState = (): MockTerminalState => ({
  cwd: "/home/learner",
  directories: ["/", "/bin", "/dev", "/etc", "/home", "/home/learner", "/home/learner/Documents", "/home/learner/.config", "/proc", "/tmp", "/usr", "/usr/bin", "/var", "/var/log"],
  files: {
    "/home/learner/notes.txt": "CyberTeKa Linux practice notes\nUse least privilege.\n",
    "/home/learner/secure.txt": "This virtual file is used by the permission lab.\n",
    "/home/learner/.bashrc": "# Simulated shell configuration\n",
    "/home/learner/Documents/readme.txt": "This is a virtual lab file.\n",
    "/etc/hostname": "cyberteka-lab\n",
    "/etc/passwd": "root:x:0:0:root:/root:/bin/bash\nlearner:x:1000:1000:Learner:/home/learner:/bin/bash\noperator:x:1001:1001:Operator:/home/operator:/bin/bash\n",
    "/var/log/auth.log": `${authLog}\n`,
  },
  modes: {
    "/home/learner/notes.txt": "644",
    "/home/learner/secure.txt": "600",
    "/home/learner/.bashrc": "644",
    "/home/learner/Documents/readme.txt": "644",
    "/etc/hostname": "644",
    "/etc/passwd": "644",
    "/var/log/auth.log": "640",
  },
  owners: {
    "/home/learner/notes.txt": "learner:learner",
    "/home/learner/secure.txt": "learner:learner",
    "/home/learner/.bashrc": "learner:learner",
    "/home/learner/Documents/readme.txt": "learner:learner",
    "/etc/hostname": "root:root",
    "/etc/passwd": "root:root",
    "/var/log/auth.log": "root:adm",
  },
  links: {},
  umask: "0022",
  processes: [
    { pid: 1, name: "init", state: "running", user: "root" },
    { pid: 728, name: "sshd", state: "running", user: "root" },
    { pid: 1420, name: "syslog", state: "running", user: "root" },
    { pid: 2345, name: "lab-worker", state: "sleeping", user: "learner" },
    { pid: 2451, name: "bash", state: "running", user: "learner" },
  ],
  jobs: [],
  nextPid: 3000,
});

const normalizePath = (path: string, cwd: string) => {
  const parts = (path.startsWith("/") ? path : `${cwd}/${path}`).split("/");
  const resolved: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") resolved.pop();
    else resolved.push(part);
  }
  return `/${resolved.join("/")}`;
};

const parentPath = (path: string) => path.slice(0, path.lastIndexOf("/")) || "/";
const basename = (path: string) => path.slice(path.lastIndexOf("/") + 1);
const isDirectory = (state: MockTerminalState, path: string) => state.directories.includes(path);
const isFile = (state: MockTerminalState, path: string) => Object.hasOwn(state.files, path) || Object.hasOwn(state.links, path);
const exists = (state: MockTerminalState, path: string) => isDirectory(state, path) || isFile(state, path);

const readFile = (state: MockTerminalState, path: string, depth = 0): string | undefined => {
  if (depth > 8) return undefined;
  const link = state.links[path];
  if (link) return readFile(state, normalizePath(link.target, parentPath(path)), depth + 1);
  return state.files[path];
};

const tokenize = (command: string): string[] => {
  const tokens: string[] = [];
  const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^']*)'|(\S+)/g;
  for (const match of command.matchAll(pattern)) tokens.push(match[1] ?? match[2] ?? match[3] ?? "");
  return tokens;
};

const listDirectory = (state: MockTerminalState, path: string, showHidden: boolean, long: boolean) => {
  if (!isDirectory(state, path)) return { output: "", error: `ls: cannot access '${path}': No such directory` };
  const names = new Set<string>();
  for (const directory of state.directories) {
    if (parentPath(directory) === path && directory !== "/") names.add(`${basename(directory)}/`);
  }
  for (const file of [...Object.keys(state.files), ...Object.keys(state.links)]) {
    if (parentPath(file) === path) names.add(basename(file));
  }
  const visible = [...names].filter((name) => showHidden || !name.startsWith(".")).sort((a, b) => a.localeCompare(b));
  if (!long) return { output: visible.join("  ") };
  return {
    output: visible.map((name) => {
      const pathName = normalizePath(name.replace(/\/$/, ""), path);
      const mode = state.modes[pathName] ?? (name.endsWith("/") ? "755" : "644");
      const owner = state.owners[pathName] ?? "learner:learner";
      const type = name.endsWith("/") ? "d" : state.links[pathName] ? "l" : "-";
      const permissions = mode.split("").map((digit) => {
        const value = Number(digit);
        return `${value & 4 ? "r" : "-"}${value & 2 ? "w" : "-"}${value & 1 ? "x" : "-"}`;
      }).join("");
      const size = readFile(state, pathName)?.length ?? 0;
      return `${type}${permissions} ${owner.padEnd(13)} ${String(size).padStart(5)} ${name}`;
    }).join("\n"),
  };
};

const runSimpleCommand = (source: string, input: string, state: MockTerminalState): MockCommandResult => {
  const args = tokenize(source);
  const command = args.shift();
  if (!command) return { state, output: "" };
  const fail = (message: string): MockCommandResult => ({ state, output: message, error: message });
  const resolve = (path: string) => normalizePath(path, state.cwd);
  const readPaths = (paths: string[]) => {
    if (paths.length === 0) return input;
    return paths.map((item) => {
      const path = resolve(item);
      if (isDirectory(state, path)) throw new Error(`cat: ${item}: Is a directory`);
      const content = readFile(state, path);
      if (content === undefined) throw new Error(`cat: ${item}: No such file`);
      return content;
    }).join("");
  };

  try {
    switch (command) {
      case "help":
        return { state, output: "Virtual Linux lab. Supported: pwd cd ls touch mkdir rm cp mv ln cat less head tail stat find grep cut awk sed sort uniq chmod chown chgrp umask id whoami env printenv uname hostname sudo ps top htop kill killall jobs bg fg ip ifconfig ping route ss netstat nmap curl wget ssh systemctl journalctl crontab apt dnf df free uptime echo clear help. No host commands are executed." };
      case "pwd":
        return { state, output: state.cwd };
      case "whoami":
        return { state, output: "learner" };
      case "uname":
        return { state, output: args.includes("-a") ? "Linux cyberteka-lab 6.8.0-virtual #1 SMP x86_64 GNU/Linux" : "Linux" };
      case "hostname":
        return { state, output: "cyberteka-lab" };
      case "env":
        return { state, output: "HOME=/home/learner\nSHELL=/bin/bash\nUSER=learner\nPATH=/usr/local/bin:/usr/bin:/bin" };
      case "printenv": {
        const values: Record<string, string> = { HOME: "/home/learner", SHELL: "/bin/bash", USER: "learner", PATH: "/usr/local/bin:/usr/bin:/bin" };
        return args[0] ? { state, output: values[args[0]] ?? "" } : { state, output: Object.keys(values).join("\n") };
      }
      case "id":
        return { state, output: "uid=1000(learner) gid=1000(learner) groups=1000(learner),27(sudo-lab-disabled)" };
      case "umask": {
        if (!args[0]) return { state, output: state.umask ?? "0022" };
        if (!/^[0-7]{3,4}$/.test(args[0])) return fail("umask: expected an octal mode");
        const umask = args[0].padStart(4, "0");
        return { state: { ...state, umask }, output: umask };
      }
      case "cd": {
        const destination = args[0] ? resolve(args[0]) : "/home/learner";
        if (!isDirectory(state, destination)) return fail(`cd: ${args[0] ?? "~"}: No such directory`);
        return { state: { ...state, cwd: destination }, output: "" };
      }
      case "ls": {
        const flags = args.filter((arg) => arg.startsWith("-")).join("");
        const paths = args.filter((arg) => !arg.startsWith("-"));
        const path = resolve(paths[0] ?? ".");
        if (isFile(state, path)) return { state, output: basename(path) };
        const result = listDirectory(state, path, flags.includes("a"), flags.includes("l"));
        return result.error ? fail(result.error) : { state, output: result.output };
      }
      case "mkdir": {
        const makeParents = args.includes("-p");
        const targets = args.filter((arg) => !arg.startsWith("-"));
        if (targets.length === 0) return fail("mkdir: missing operand");
        const directories = new Set(state.directories);
        for (const target of targets) {
          const path = resolve(target);
          if (exists(state, path)) return fail(`mkdir: cannot create directory '${target}': File exists`);
          if (makeParents) {
            let current = "/";
            for (const part of path.split("/").filter(Boolean)) {
              current = normalizePath(part, current);
              directories.add(current);
            }
          } else {
            if (!directories.has(parentPath(path))) return fail(`mkdir: cannot create directory '${target}': Parent directory does not exist`);
            directories.add(path);
          }
        }
        return { state: { ...state, directories: [...directories] }, output: "" };
      }
      case "touch": {
        if (args.length === 0) return fail("touch: missing file operand");
        const files = { ...state.files };
        for (const target of args) {
          const path = resolve(target);
          if (!isDirectory(state, parentPath(path))) return fail(`touch: cannot touch '${target}': Parent directory does not exist`);
          if (!exists(state, path)) files[path] = "";
        }
        return { state: { ...state, files }, output: "" };
      }
      case "rm": {
        const recursive = args.includes("-r") || args.includes("-rf") || args.includes("-fr");
        const force = args.includes("-f") || args.includes("-rf") || args.includes("-fr");
        const targets = args.filter((arg) => !arg.startsWith("-"));
        if (targets.length === 0) return fail("rm: missing operand");
        const files = { ...state.files };
        const links = { ...state.links };
        const directories = new Set(state.directories);
        for (const target of targets) {
          const path = resolve(target);
          if (path === "/" || path === "/home/learner") return fail("rm: protected lab directory");
          if (isDirectory(state, path)) {
            if (!recursive) return fail(`rm: cannot remove '${target}': Is a directory (use -r in this virtual lab)`);
            for (const name of Object.keys(files)) if (name.startsWith(`${path}/`)) delete files[name];
            for (const name of Object.keys(links)) if (name.startsWith(`${path}/`)) delete links[name];
            for (const name of [...directories]) if (name === path || name.startsWith(`${path}/`)) directories.delete(name);
          } else if (Object.hasOwn(files, path)) delete files[path];
          else if (Object.hasOwn(links, path)) delete links[path];
          else if (!force) return fail(`rm: cannot remove '${target}': No such file`);
        }
        return { state: { ...state, files, links, directories: [...directories] }, output: "" };
      }
      case "cp":
      case "mv": {
        if (args.length < 2) return fail(`${command}: missing file operand`);
        const sourcePath = resolve(args[0]);
        const targetPath = resolve(args[1]);
        const content = readFile(state, sourcePath);
        if (content === undefined) return fail(`${command}: cannot stat '${args[0]}': No such file`);
        if (!isDirectory(state, parentPath(targetPath))) return fail(`${command}: target parent does not exist`);
        const finalPath = isDirectory(state, targetPath) ? normalizePath(basename(sourcePath), targetPath) : targetPath;
        const files = { ...state.files, [finalPath]: content };
        const modes = { ...state.modes, [finalPath]: state.modes[sourcePath] ?? "644" };
        const owners = { ...state.owners, [finalPath]: state.owners[sourcePath] ?? "learner:learner" };
        if (command === "mv") delete files[sourcePath];
        return { state: { ...state, files, modes, owners }, output: "" };
      }
      case "ln": {
        const symbolic = args[0] === "-s";
        const operands = symbolic ? args.slice(1) : args;
        if (operands.length < 2) return fail("ln: missing file operand");
        const target = resolve(operands[0]);
        const destination = resolve(operands[1]);
        if (!symbolic && !isFile(state, target)) return fail(`ln: failed to access '${operands[0]}': No such file`);
        if (!isDirectory(state, parentPath(destination)) || exists(state, destination)) return fail(`ln: cannot create link '${operands[1]}'`);
        if (symbolic) return { state: { ...state, links: { ...state.links, [destination]: { kind: "symbolic", target: operands[0] } } }, output: "" };
        return { state: { ...state, links: { ...state.links, [destination]: { kind: "hard", target } } }, output: "" };
      }
      case "cat":
      case "less":
      case "head":
      case "tail": {
        const countIndex = args.findIndex((arg) => arg === "-n");
        const count = countIndex >= 0 ? Math.max(0, Number(args[countIndex + 1]) || 10) : 10;
        const paths = args.filter((arg, index) => !arg.startsWith("-") && index !== countIndex + 1);
        const content = readPaths(paths);
        if (command === "head") return { state, output: content.split("\n").slice(0, count).join("\n").replace(/\n$/, "") };
        if (command === "tail") return { state, output: content.split("\n").slice(-count).join("\n").replace(/\n$/, "") };
        return { state, output: content.replace(/\n$/, "") };
      }
      case "stat": {
        const target = args.find((arg) => !arg.startsWith("-"));
        if (!target) return fail("stat: missing file operand");
        const path = resolve(target);
        if (!exists(state, path)) return fail(`stat: cannot stat '${target}': No such file`);
        const mode = state.modes[path] ?? (isDirectory(state, path) ? "755" : "644");
        const owner = state.owners[path] ?? "learner:learner";
        return { state, output: `  File: ${path}\n  Size: ${readFile(state, path)?.length ?? 0}\nAccess: (${mode}/-rw-------)\nUid: (${owner.split(":")[0]}) Gid: (${owner.split(":")[1]})` };
      }
      case "find": {
        const root = resolve(args.find((arg) => !arg.startsWith("-")) ?? ".");
        const nameIndex = args.indexOf("-name");
        const name = nameIndex >= 0 ? args[nameIndex + 1] : undefined;
        if (!isDirectory(state, root)) return fail(`find: '${root}': No such directory`);
        const paths = [...state.directories, ...Object.keys(state.files), ...Object.keys(state.links)]
          .filter((path) => path === root || path.startsWith(`${root.replace(/\/$/, "")}/`))
          .filter((path) => !name || basename(path) === name)
          .sort((a, b) => a.localeCompare(b));
        return { state, output: paths.join("\n") };
      }
      case "cut": {
        const delimiterArg = args.find((arg) => arg.startsWith("-d"));
        const fieldArg = args.find((arg) => arg.startsWith("-f"));
        const delimiter = delimiterArg?.slice(2) || args[args.indexOf("-d") + 1] || "\t";
        const fieldValue = fieldArg?.slice(2) || args[args.indexOf("-f") + 1] || "1";
        const field = Number(fieldValue);
        if (!Number.isInteger(field) || field < 1) return fail("cut: expected a positive field number");
        const path = args.find((arg) => !arg.startsWith("-"));
        const content = readPaths(path ? [path] : []);
        return { state, output: content.split("\n").filter(Boolean).map((line) => line.split(delimiter)[field - 1] ?? "").join("\n") };
      }
      case "grep": {
        const insensitive = args.includes("-i");
        const pattern = args.find((arg) => !arg.startsWith("-"));
        if (!pattern) return fail("grep: missing pattern");
        const paths = args.filter((arg) => !arg.startsWith("-") && arg !== pattern);
        const content = readPaths(paths);
        const lines = content.split("\n").filter((line) => insensitive ? line.toLowerCase().includes(pattern.toLowerCase()) : line.includes(pattern));
        return { state, output: lines.join("\n") };
      }
      case "awk": {
        const delimiterIndex = args.indexOf("-F");
        const delimiter = delimiterIndex >= 0 ? args[delimiterIndex + 1] ?? " " : " ";
        const program = args.find((arg) => arg.startsWith("{") && arg.endsWith("}"));
        if (!program) return fail("awk: supported form is '{print $N}'");
        const fieldMatch = program.match(/\$([0-9]+)/);
        if (!fieldMatch) return fail("awk: supported form is '{print $N}'");
        const filePath = args.find((arg) => !arg.startsWith("-") && arg !== program && arg !== delimiter);
        const content = readPaths(filePath ? [filePath] : []);
        return { state, output: content.split("\n").filter(Boolean).map((line) => line.split(delimiter)[Number(fieldMatch[1]) - 1] ?? "").join("\n") };
      }
      case "sed": {
        const expression = args.find((arg) => arg.startsWith("s/"));
        if (!expression) return fail("sed: supported form is 's/search/replacement/g'");
        const match = expression.match(/^s\/([^/]*)\/([^/]*)\/(g)?$/);
        if (!match) return fail("sed: malformed substitution");
        const filePath = args.find((arg) => !arg.startsWith("s/"));
        const content = readPaths(filePath ? [filePath] : []);
        const escaped = match[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return { state, output: content.replace(new RegExp(escaped, match[3] ? "g" : ""), match[2]).replace(/\n$/, "") };
      }
      case "sort": {
        const lines = input.split("\n").filter(Boolean);
        lines.sort((a, b) => args.includes("-n") ? Number(a) - Number(b) : a.localeCompare(b));
        if (args.includes("-r")) lines.reverse();
        return { state, output: lines.join("\n") };
      }
      case "uniq": {
        const lines = input.split("\n").filter(Boolean);
        const counts: Array<[string, number]> = [];
        for (const line of lines) {
          const last = counts[counts.length - 1];
          if (last?.[0] === line) last[1] += 1;
          else counts.push([line, 1]);
        }
        return { state, output: args.includes("-c") ? counts.map(([line, count]) => `${String(count).padStart(7)} ${line}`).join("\n") : counts.map(([line]) => line).join("\n") };
      }
      case "echo":
        return { state, output: args.join(" ") };
      case "getent":
      case "nslookup":
      case "dig": {
        const name = command === "getent" ? args.at(-1) : args.find((arg) => !arg.startsWith("-") && arg !== "hosts");
        if (name !== "example.test") return fail(`${command}: only the fixed example.test DNS fixture is available`);
        return { state, output: command === "getent" ? "192.0.2.80 example.test" : "Name: example.test\nAddress: 192.0.2.80\nDNS query simulated; no network request was sent." };
      }
      case "curl":
      case "wget": {
        const url = args.find((arg) => /^https?:\/\//.test(arg));
        if (!url) return fail(`${command}: expected an https://example.test/ fixture URL`);
        if (!/^https?:\/\/example\.test\/?$/.test(url)) return fail(`${command}: only the fixed example.test fixture is available; no network request was sent`);
        return { state, output: "<!doctype html>\n<title>CyberTeKa network fixture</title>\n<p>Simulated response from example.test.</p>" };
      }
      case "systemctl": {
        if (args[0] !== "status" || args[1] !== "sshd") return fail("systemctl: only read-only status for the mock sshd service is supported");
        return { state, output: "sshd.service - OpenSSH server daemon\n     Loaded: loaded (virtual fixture)\n     Active: active (running) since simulated startup" };
      }
      case "journalctl": {
        if (args.includes("-u") && args[args.indexOf("-u") + 1] !== "sshd") return fail("journalctl: only the mock sshd service log is available");
        return { state, output: "Oct 02 09:14:02 cyberteka-lab sshd[728]: Server listening on 0.0.0.0 port 22.\nOct 02 09:14:12 cyberteka-lab sshd[728]: Accepted publickey for learner from 192.0.2.45." };
      }
      case "crontab":
        return args.includes("-l") ? { state, output: "# Simulated learner crontab\n15 3 * * 1 /home/learner/bin/weekly-report" } : fail("crontab: only read-only listing is available in this simulator");
      case "apt":
      case "dnf":
        return args.includes("list") || args.includes("installed")
          ? { state, output: "bash (virtual)\ncoreutils (virtual)\nopenssh-client (virtual)\ngrep (virtual)" }
          : fail(`${command}: package changes are not available in this simulator`);
      case "chmod": {
        if (args.length < 2) return fail("chmod: usage: chmod MODE FILE");
        const [mode, ...targets] = args;
        const modes = { ...state.modes };
        for (const target of targets) {
          const path = resolve(target);
          if (!isFile(state, path) && !isDirectory(state, path)) return fail(`chmod: cannot access '${target}': No such file`);
          if (/^[0-7]{3,4}$/.test(mode)) modes[path] = mode.slice(-3);
          else {
            const match = mode.match(/^([ugoa]*)([+-=])([rwx]+)$/);
            if (!match) return fail(`chmod: invalid mode '${mode}'`);
            const previous = (modes[path] ?? "644").split("").map(Number);
            const classes = match[1] ? [...new Set(match[1].replace("a", "ugo").split(""))] : ["u", "g", "o"];
            const bits = [...match[3]].reduce((sum, bit) => sum + ({ r: 4, w: 2, x: 1 }[bit] ?? 0), 0);
            for (const currentClass of classes) {
              const index = { u: 0, g: 1, o: 2 }[currentClass];
              if (index === undefined) continue;
              previous[index] = match[2] === "+" ? previous[index] | bits : match[2] === "-" ? previous[index] & ~bits : bits;
            }
            modes[path] = previous.join("");
          }
        }
        return { state: { ...state, modes }, output: `Mode set to ${modes[resolve(targets[0])]}` };
      }
      case "chown":
      case "chgrp": {
        if (args.length < 2) return fail(`${command}: usage: ${command} OWNER FILE`);
        const owners = { ...state.owners };
        const [identity, ...targets] = args;
        for (const target of targets) {
          const path = resolve(target);
          if (!isFile(state, path) && !isDirectory(state, path)) return fail(`${command}: cannot access '${target}': No such file`);
          const current = owners[path] ?? "learner:learner";
          owners[path] = command === "chgrp" ? `${current.split(":")[0]}:${identity}` : identity.includes(":") ? identity : `${identity}:${current.split(":")[1]}`;
        }
        return { state: { ...state, owners }, output: "" };
      }
      case "sudo":
        return fail("sudo: privilege escalation is disabled in the isolated learning simulator");
      case "ps":
      case "top":
      case "htop":
        return { state, output: ["PID USER     S COMMAND", ...state.processes.map((process) => `${String(process.pid).padEnd(3)} ${process.user.padEnd(8)} ${process.state[0].toUpperCase()} ${process.name}`)].join("\n") };
      case "kill": {
        const pid = Number(args.at(-1));
        if (!Number.isInteger(pid)) return fail("kill: expected a numeric mock PID");
        if (pid === 1) return fail("kill: refusing to signal protected lab init");
        const process = state.processes.find((item) => item.pid === pid);
        if (!process) return fail(`kill: (${pid}) - No such mock process`);
        const processes = state.processes.filter((item) => item.pid !== pid);
        return { state: { ...state, processes }, output: `Process ${pid} terminated (simulation)` };
      }
      case "killall": {
        const name = args.find((arg) => !arg.startsWith("-"));
        if (!name) return fail("killall: expected a mock process name");
        if (name === "init") return fail("killall: refusing to signal protected lab init");
        const matched = state.processes.filter((process) => process.name === name && process.user === "learner");
        if (matched.length === 0) return fail(`killall: ${name}: no matching learner process`);
        return { state: { ...state, processes: state.processes.filter((process) => !matched.includes(process)) }, output: `${matched.length} mock process(es) terminated` };
      }
      case "jobs":
        return { state, output: state.jobs.length ? state.jobs.map((job, index) => `[${index + 1}]+ Running ${job}`).join("\n") : "No active shell jobs" };
      case "bg":
        return { state, output: state.jobs.length ? `[1]+ ${state.jobs[0]} &` : "bg: no current job" };
      case "fg":
        return { state, output: state.jobs.length ? state.jobs[0] : "fg: no current job" };
      case "ip":
        if (args[0] === "addr" || args[0] === "address") return { state, output: "1: lo: <LOOPBACK,UP> mtu 65536\n    inet 127.0.0.1/8 scope host lo\n2: eth0: <BROADCAST,MULTICAST,UP> mtu 1500\n    inet 192.0.2.10/24 scope global eth0" };
        if (args[0] === "route") return { state, output: "default via 192.0.2.1 dev eth0\n192.0.2.0/24 dev eth0 proto kernel scope link" };
        return fail("ip: supported lab forms are 'ip addr' and 'ip route'");
      case "ifconfig":
        return { state, output: "eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>\n      inet 192.0.2.10 netmask 255.255.255.0\nlo: flags=73<UP,LOOPBACK,RUNNING>\n      inet 127.0.0.1 netmask 255.0.0.0" };
      case "route":
        return { state, output: "Kernel IP routing table\nDestination Gateway Genmask Flags Iface\n0.0.0.0 192.0.2.1 0.0.0.0 UG eth0\n192.0.2.0 0.0.0.0 255.255.255.0 U eth0" };
      case "ping": {
        const target = args.find((arg) => !arg.startsWith("-"));
        if (!target) return fail("ping: destination required");
        if (target !== "192.0.2.20" && target !== "192.0.2.53") return fail("ping: target outside isolated documentation-only lab scope");
        return { state, output: `PING ${target} (simulation)\n64 bytes from ${target}: icmp_seq=1 ttl=64 time=0.4 ms\n--- ${target} ping statistics ---\n1 packets transmitted, 1 received, 0% packet loss` };
      }
      case "ss":
      case "netstat":
        if (!args.some((arg) => arg.includes("l"))) return fail(`${command}: use -l to request the mock listening sockets`);
        return { state, output: "Netid State  Recv-Q Send-Q Local Address:Port Peer Address:Port\ntcp   LISTEN 0      128    0.0.0.0:22       0.0.0.0:*\ntcp   LISTEN 0      128    0.0.0.0:80       0.0.0.0:*\nudp   UNCONN 0      0      127.0.0.1:53     0.0.0.0:*" };
      case "nmap": {
        const target = args.find((arg) => /^\d+\.\d+\.\d+\.\d+$/.test(arg));
        if (!target) return fail("nmap: target required; only fixed documentation hosts are available in this mock lab");
        if (target === "192.0.2.20") return { state, output: "Starting Nmap (SIMULATED)\nNmap scan report for 192.0.2.20\nHost is up (simulated).\nPORT   STATE SERVICE\n22/tcp open  ssh\n80/tcp open  http\nScan complete: no packets were sent." };
        if (target === "192.0.2.53") return { state, output: "Starting Nmap (SIMULATED)\nNmap scan report for 192.0.2.53\nHost is up (simulated).\nPORT   STATE SERVICE\n53/udp open  domain\nScan complete: no packets were sent." };
        return fail("nmap: target outside isolated documentation-only lab scope; no packets were sent");
      }
      case "ssh": {
        const target = args.find((arg) => !arg.startsWith("-")) ?? "";
        const host = target.includes("@") ? target.split("@").pop() ?? "" : target;
        if (host !== "192.0.2.20" && host !== "192.0.2.53") {
          return fail("ssh: only the simulated documentation hosts 192.0.2.20 and 192.0.2.53 are available; no real connection is made");
        }
        return { state, output: `Connected to ${target} (simulated).\nHost key verified against known_hosts. No real network connection was opened.` };
      }
      case "df":
        return { state, output: "Filesystem      Size  Used Avail Use% Mounted on\n/dev/vda1        40G   12G   26G  32% /\n/dev/vdb1       100G   18G   77G  19% /var" };
      case "free":
        return { state, output: "              total        used        free      shared  buff/cache   available\nMem:           8000        3200        4800         120          ---        4200\nSwap:          2048           0        2048" };
      case "uptime":
        return { state, output: " 10:42:00 up 3 days,  4:12,  1 user,  load average: 0.08, 0.12, 0.10" };
      case "clear":
        return { state, output: "", clear: true };
      default:
        return fail(`${command}: command unavailable in the virtual lab. Run 'help' for supported commands.`);
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Command failed in virtual lab");
  }
};

const writeVirtualFile = (state: MockTerminalState, pathValue: string, content: string, append: boolean) => {
  const path = normalizePath(pathValue, state.cwd);
  if (isDirectory(state, path)) return { state, error: `cannot write '${pathValue}': Is a directory` };
  if (!isDirectory(state, parentPath(path))) return { state, error: `cannot write '${pathValue}': Parent directory does not exist` };
  const existing = state.files[path] ?? "";
  return { state: { ...state, files: { ...state.files, [path]: `${append ? existing : ""}${content}${content && !content.endsWith("\n") ? "\n" : ""}` } } };
};

export const executeMockCommand = (source: string, initialState: MockTerminalState): MockCommandResult => {
  const line = source.trim();
  if (!line) return { state: initialState, output: "" };
  if (/[;`]|&&|\|\||\$\(|\$\{|\n/.test(line)) {
    const message = "Shell chaining, command substitution, and multiline scripts are disabled in this simulator.";
    return { state: initialState, output: message, error: message };
  }

  let commandText = line;
  let input = "";
  const inputRedirect = commandText.match(/(?:^|\s)<\s*([^\s<>|]+)/);
  if (inputRedirect) {
    const path = normalizePath(inputRedirect[1], initialState.cwd);
    const content = readFile(initialState, path);
    if (content === undefined) return { state: initialState, output: `input: ${inputRedirect[1]}: No such virtual file`, error: "Missing virtual input file" };
    input = content;
    commandText = commandText.replace(inputRedirect[0], " ").trim();
  }
  const outputRedirect = commandText.match(/(?:^|\s)(>>|>)\s*([^\s<>|]+)/);
  const redirectMode = outputRedirect?.[1];
  const outputPath = outputRedirect?.[2];
  if (outputRedirect) commandText = commandText.replace(outputRedirect[0], " ").trim();

  const background = /\s&$/.test(commandText);
  if (background) commandText = commandText.replace(/\s&$/, "").trim();
  const pipeline = commandText.split(/\s*\|\s*/);
  if (pipeline.some((part) => !part.trim())) return { state: initialState, output: "syntax error: empty pipeline stage", error: "Empty pipeline stage" };

  let state = initialState;
  let output = "";
  let error: string | undefined;
  for (const part of pipeline) {
    const result = runSimpleCommand(part, input, state);
    state = result.state;
    output = result.output;
    error = result.error;
    input = output;
    if (error) break;
  }

  if (background && !error) {
    const commandName = tokenize(pipeline[0])[0] ?? "job";
    state = { ...state, jobs: [...state.jobs, commandName] };
    output = `[${state.jobs.length}] ${state.nextPid} ${commandName} started in simulation`;
    state = { ...state, nextPid: state.nextPid + 1 };
  }
  if (outputPath && !error) {
    const written = writeVirtualFile(state, outputPath, output, redirectMode === ">>");
    state = written.state;
    if (written.error) {
      error = written.error;
      output = written.error;
    } else output = "";
  }

  return { state, output, error };
};