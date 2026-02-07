# Apple Container CLI - Comprehensive Technical Documentation

## Overview

Apple Container is an open-source tool for creating and running Linux containers as lightweight virtual machines on Mac computers. Written in Swift and optimized for Apple silicon, it represents Apple's official entry into the container runtime ecosystem with macOS 26 (Tahoe).

**Key Characteristics:**
- Native Swift-based implementation
- Optimized for Apple Silicon (M-series chips)
- OCI-compatible (Open Container Initiative)
- VM-per-container architecture
- Open source on GitHub: https://github.com/apple/container

**Version Information:**
- Current Release: 0.8.0 (as of 2026)
- Project Status: Active development (pre-1.0)
- Stability: Guaranteed within patch versions only (e.g., 0.8.0 to 0.8.1)
- Minor version releases may include breaking changes

### System Requirements

**Hardware:**
- Mac with Apple silicon (M-series chips) - REQUIRED
- Intel-based Macs are NOT supported
- M3 or newer required for nested virtualization features

**Operating System:**
- macOS 26 (Tahoe) - RECOMMENDED and officially supported
- macOS 15 (Sequoia) - Works with significant limitations (see Limitations section)

**Build Requirements:**
- Xcode 26
- macOS 15 minimum, macOS 26 recommended

## Architecture & Technical Design

### VM-per-Container Model

Unlike Docker Desktop which runs one large Linux VM in the background, Apple Container uses a unique "VM-per-container" architecture:

**Benefits:**
1. **Security:** Each container has the isolation properties of a full VM
2. **Privacy:** Mount only necessary data into each VM (not all data upfront)
3. **Performance:** Containers require less memory than full VMs with comparable boot times
4. **Resource Management:** Individual resource allocation per container

**Technical Stack:**
- **Virtualization Framework:** Managing Linux VMs and attached devices
- **vmnet Framework:** Managing virtual networks
- **XPC:** Interprocess communication
- **Launchd:** Service management
- **Keychain Services:** Registry credentials access
- **Unified Logging System:** Application logging

### Service Architecture

The CLI communicates with a client library that interacts with multiple services:

1. **container-apiserver:** Launch agent (starts with `container system start`)
   - Provides client APIs for managing containers and networks
   - Launches helper services

2. **container-core-images:** XPC helper for image management
   - Manages local content store
   - Exposes image management API

3. **container-network-vmnet:** XPC helper for networking
   - Manages virtual network infrastructure

4. **container-runtime-linux:** Per-container runtime helper
   - One instance per container
   - Exposes container-specific management API

5. **BuildKit-based builder:** For image builds
   - Runs as a utility container
   - Default: 2 CPUs, 2 GiB RAM

## Installation & Setup

### Install from Official Release

1. **Download:** Get the latest signed installer package from:
   https://github.com/apple/container/releases

2. **Install:** Double-click the package and follow instructions
   - Requires administrator password
   - Installs to `/usr/local`

3. **Start Services:**
```bash
container system start
```

On first start, you'll be prompted to install the default Linux kernel:
```bash
No default kernel configured.
Install the recommended default kernel from [https://github.com/kata-containers/kata-containers/releases/download/3.17.0/kata-static-3.17.0-arm64.tar.xz]? [Y/n]: y
```

### Upgrade Existing Installation

```bash
# Stop services
container system stop

# Uninstall (keep user data)
/usr/local/bin/uninstall-container.sh -k

# Download and install new version (see above)

# Start services
container system start
```

### Uninstall

**Remove everything (including user data):**
```bash
container system stop
/usr/local/bin/uninstall-container.sh -d
```

**Keep user data:**
```bash
container system stop
/usr/local/bin/uninstall-container.sh -k
```

### Build from Source

```bash
# Clone repository
git clone https://github.com/apple/container.git
cd container

# Build and test
make all test integration

# Install (requires sudo)
make install

# For release build (better performance)
BUILD_CONFIGURATION=release make all test integration
BUILD_CONFIGURATION=release make install
```

## CLI Commands Reference

### Core Commands

#### `container run`

Runs a container from an image. Default runs in foreground with stdin closed.

**Syntax:**
```bash
container run [<options>] <image> [<arguments> ...]
```

**Process Options:**
- `-e, --env <env>`: Set environment variables (key=value format)
- `--env-file <file>`: Read environment variables from file
- `--gid <gid>`: Set group ID for the process
- `-i, --interactive`: Keep stdin open
- `-t, --tty`: Open a TTY with the process
- `-u, --user <user>`: Set user (name|uid[:gid])
- `--uid <uid>`: Set user ID
- `-w, --workdir, --cwd <dir>`: Set initial working directory

**Resource Options:**
- `-c, --cpus <cpus>`: Number of CPUs (default: 4)
- `-m, --memory <memory>`: Memory with K/M/G/T/P suffix (default: 1GB)

**Management Options:**
- `-a, --arch <arch>`: Architecture (default: arm64)
- `--cidfile <file>`: Write container ID to file
- `-d, --detach`: Run in background
- `--dns <ip>`: DNS nameserver IP
- `--dns-domain <domain>`: Default DNS domain
- `--dns-option <option>`: DNS options
- `--dns-search <domain>`: DNS search domains
- `--entrypoint <cmd>`: Override image entrypoint
- `-k, --kernel <path>`: Custom kernel path
- `-l, --label <label>`: Add key=value label
- `--mount <mount>`: Add mount (type=<>,source=<>,target=<>,readonly)
- `--name <name>`: Container ID/name
- `--network <network>`: Attach to network
- `--no-dns`: Do not configure DNS
- `--os <os>`: OS type (default: linux)
- `-p, --publish <spec>`: Publish port ([host-ip:]host-port:container-port[/protocol])
- `--platform <platform>`: Platform (os/arch[/variant])
- `--publish-socket <spec>`: Publish socket (host_path:container_path)
- `--rm, --remove`: Remove container after it stops
- `--ssh`: Forward SSH agent socket
- `--tmpfs <path>`: Add tmpfs mount
- `-v, --volume <volume>`: Bind mount volume
- `--virtualization`: Expose virtualization capabilities (requires M3+)
- `--runtime`: Runtime handler (default: container-runtime-linux)

**Registry Options:**
- `--scheme <scheme>`: Connection scheme (http/https/auto, default: auto)

**Progress Options:**
- `--progress <type>`: Progress type (none/ansi, default: ansi)

**Examples:**
```bash
# Interactive shell
container run -it ubuntu:latest /bin/bash

# Background web server
container run -d --name web -p 8080:80 nginx:latest

# Resource limits and environment
container run -e NODE_ENV=production --cpus 2 --memory 1G node:18

# Custom MAC address
container run --network default,mac=02:42:ac:11:00:02 ubuntu:latest
```

#### `container build`

Builds an OCI image from a local build context using Dockerfile or Containerfile.

**Syntax:**
```bash
container build [<options>] [<context-dir>]
```

**Arguments:**
- `<context-dir>`: Build directory (default: .)

**Options:**
- `-a, --arch <value>`: Architecture type
- `--build-arg <key=val>`: Set build-time variables
- `-c, --cpus <cpus>`: Builder CPUs (default: 2)
- `-f, --file <path>`: Path to Dockerfile (looks for Dockerfile then Containerfile)
- `-l, --label <key=val>`: Set label
- `-m, --memory <memory>`: Builder memory (default: 2048MB)
- `--no-cache`: Do not use cache
- `-o, --output <value>`: Output config (type=<oci|tar|local>[,dest=], default: type=oci)
- `--os <value>`: OS type
- `--platform <platform>`: Platform (os/arch[/variant])
- `--progress <type>`: Progress type (auto/plain/tty, default: auto)
- `--pull`: Pull latest image
- `-q, --quiet`: Suppress build output
- `-t, --tag <name>`: Name for built image (can be specified multiple times)
- `--target <stage>`: Target build stage
- `--vsock-port <port>`: Builder shim vsock port (default: 8088)

**Examples:**
```bash
# Basic build
container build -t my-app:latest .

# Custom Dockerfile
container build -f docker/Dockerfile.prod -t my-app:prod .

# Build args
container build --build-arg NODE_VERSION=18 -t my-app .

# Multi-stage build
container build --target production --no-cache -t my-app:prod .

# Multiple tags
container build -t my-app:latest -t my-app:v1.0.0 -t my-app:stable .

# Multiplatform image
container build --arch arm64 --arch amd64 -t registry.example.com/my-app:latest .
```

### Container Management Commands

#### `container create`

Creates a container without starting it. Accepts same options as `container run`.

**Syntax:**
```bash
container create [<options>] <image> [<arguments> ...]
```

#### `container start`

Starts a stopped container.

**Syntax:**
```bash
container start [--attach] [--interactive] <container-id>
```

**Options:**
- `-a, --attach`: Attach stdout/stderr
- `-i, --interactive`: Attach stdin

#### `container stop`

Stops running containers gracefully with a timeout before SIGKILL.

**Syntax:**
```bash
container stop [--all] [--signal <signal>] [--time <time>] [<container-ids> ...]
```

**Options:**
- `-a, --all`: Stop all running containers
- `-s, --signal <signal>`: Signal to send (default: SIGTERM)
- `-t, --time <time>`: Timeout in seconds (default: 5)

#### `container kill`

Immediately kills containers with a signal.

**Syntax:**
```bash
container kill [--all] [--signal <signal>] [<container-ids> ...]
```

**Options:**
- `-a, --all`: Kill all running containers
- `-s, --signal <signal>`: Signal to send (default: KILL)

#### `container delete (rm)`

Deletes one or more containers.

**Syntax:**
```bash
container delete [--all] [--force] [<container-ids> ...]
```

**Options:**
- `-a, --all`: Delete all containers
- `-f, --force`: Delete running containers

#### `container list (ls)`

Lists containers.

**Syntax:**
```bash
container list [--all] [--format <format>] [--quiet]
```

**Options:**
- `-a, --all`: Include stopped containers
- `--format <format>`: Output format (json/table, default: table)
- `-q, --quiet`: Only output container ID

**Example Output:**
```
ID             IMAGE            OS     ARCH   STATE    ADDR
my-web-server  web-test:latest  linux  arm64  running  192.168.64.3
buildkit       builder:0.0.3    linux  arm64  running  192.168.64.2
```

#### `container exec`

Executes a command in a running container.

**Syntax:**
```bash
container exec [options] <container-id> <arguments> ...
```

**Options:**
- `-d, --detach`: Detach from process
- `-e, --env <env>`: Set environment variables
- `--env-file <file>`: Read environment variables from file
- `--gid <gid>`: Group ID
- `-i, --interactive`: Keep stdin open
- `-t, --tty`: Open TTY
- `-u, --user <user>`: User (name|uid[:gid])
- `--uid <uid>`: User ID
- `-w, --workdir, --cwd <dir>`: Working directory

**Examples:**
```bash
# List files
container exec my-container ls /content

# Interactive shell
container exec -it my-container sh
```

#### `container logs`

Fetches logs from a container.

**Syntax:**
```bash
container logs [--boot] [--follow] [-n <n>] <container-id>
```

**Options:**
- `--boot`: Display boot log instead of stdio
- `-f, --follow`: Follow log output
- `-n <n>`: Number of lines from end (omit for all logs)

#### `container inspect`

Displays detailed container information in JSON.

**Syntax:**
```bash
container inspect <container-ids> ...
```

**Example:**
```bash
container inspect my-web-server | jq
```

#### `container stats`

Displays real-time resource usage statistics.

**Syntax:**
```bash
container stats [--format <format>] [--no-stream] [<container-ids> ...]
```

**Options:**
- `--format <format>`: Output format (json/table, default: table)
- `--no-stream`: Single snapshot instead of continuous updates

**Metrics:**
- CPU %: Percentage usage (~100% = one core, can exceed 100%)
- Memory Usage: Current vs. limit
- Net Rx/Tx: Network bytes received/transmitted
- Block I/O: Disk bytes read/written
- Pids: Number of processes

**Examples:**
```bash
# All containers (interactive)
container stats

# Specific containers
container stats web db cache

# Single snapshot
container stats --no-stream web

# JSON output
container stats --format json --no-stream web
```

#### `container prune`

Removes stopped containers to reclaim space.

**Syntax:**
```bash
container prune
```

### Image Management Commands

#### `container image list (ls)`

Lists local images.

**Syntax:**
```bash
container image list [--format <format>] [--quiet] [--verbose]
```

**Options:**
- `--format <format>`: Output format (json/table, default: table)
- `-q, --quiet`: Only output image name
- `-v, --verbose`: Verbose output

#### `container image pull`

Pulls an image from a registry.

**Syntax:**
```bash
container image pull [options] <reference>
```

**Options:**
- `--scheme <scheme>`: Connection scheme (http/https/auto, default: auto)
- `--progress <type>`: Progress type (none/ansi, default: ansi)
- `-a, --arch <arch>`: Limit to architecture
- `--os <os>`: Limit to OS
- `--platform <platform>`: Limit to platform (os/arch[/variant])

#### `container image push`

Pushes an image to a registry.

**Syntax:**
```bash
container image push [options] <reference>
```

**Options:** Same as `image pull`

#### `container image save`

Saves an image to a tar archive.

**Syntax:**
```bash
container image save [--arch <arch>] [--os <os>] --output <output> [--platform <platform>] <references> ...
```

**Options:**
- `-a, --arch <arch>`: Architecture
- `--os <os>`: OS
- `-o, --output <output>`: Output pathname (REQUIRED)
- `--platform <platform>`: Platform (os/arch[/variant])

#### `container image load`

Loads images from a tar archive.

**Syntax:**
```bash
container image load --input <input> [--force]
```

**Options:**
- `-i, --input <input>`: Path to tar archive (REQUIRED)
- `-f, --force`: Load even if invalid members detected

#### `container image tag`

Applies a new tag to an existing image.

**Syntax:**
```bash
container image tag <source> <target>
```

**Example:**
```bash
container image tag web-test registry.example.com/user/web-test:latest
```

#### `container image delete (rm)`

Deletes one or more images.

**Syntax:**
```bash
container image delete [--all] [--force] [<images> ...]
```

**Options:**
- `-a, --all`: Delete all images
- `-f, --force`: Ignore errors for not-found images

#### `container image prune`

Removes unused images.

**Syntax:**
```bash
container image prune [--all]
```

**Options:**
- `-a, --all`: Remove all unused images (not just dangling)

#### `container image inspect`

Shows detailed image information in JSON.

**Syntax:**
```bash
container image inspect <images> ...
```

### Builder Management Commands

#### `container builder start`

Starts the BuildKit builder container.

**Syntax:**
```bash
container builder start [--cpus <cpus>] [--memory <memory>]
```

**Options:**
- `-c, --cpus <cpus>`: CPUs (default: 2)
- `-m, --memory <memory>`: Memory (default: 2048MB)

#### `container builder status`

Shows builder status.

**Syntax:**
```bash
container builder status [--format <format>] [--quiet]
```

**Options:**
- `--format <format>`: Output format (json/table, default: table)
- `-q, --quiet`: Only output container ID

#### `container builder stop`

Stops the BuildKit builder.

**Syntax:**
```bash
container builder stop
```

#### `container builder delete (rm)`

Deletes the builder container.

**Syntax:**
```bash
container builder delete [--force]
```

**Options:**
- `-f, --force`: Delete even if running

### Network Management Commands (macOS 26+)

Network commands are only available on macOS 26 and later.

#### `container network create`

Creates a new network.

**Syntax:**
```bash
container network create [--label <label>] [--subnet <subnet>] [--subnet-v6 <subnet-v6>] <name>
```

**Options:**
- `--label <label>`: Set metadata
- `--subnet <subnet>`: IPv4 subnet (CIDR, e.g., 192.168.100.0/24)
- `--subnet-v6 <subnet-v6>`: IPv6 prefix (CIDR, e.g., fd00:1234::/64)

**Examples:**
```bash
# Basic network
container network create foo

# Custom subnets
container network create foo --subnet 192.168.100.0/24 --subnet-v6 fd00:1234::/64
```

#### `container network delete (rm)`

Deletes one or more networks.

**Syntax:**
```bash
container network delete [--all] [<network-names> ...]
```

**Options:**
- `-a, --all`: Delete all networks

#### `container network prune`

Removes networks not connected to containers.

**Syntax:**
```bash
container network prune
```

#### `container network list (ls)`

Lists user-defined networks.

**Syntax:**
```bash
container network list [--format <format>] [--quiet]
```

**Options:**
- `--format <format>`: Output format (json/table, default: table)
- `-q, --quiet`: Only output network name

#### `container network inspect`

Shows detailed network information.

**Syntax:**
```bash
container network inspect <networks> ...
```

### Volume Management Commands

#### `container volume create`

Creates a named volume.

**Syntax:**
```bash
container volume create [--label <label>] [--opt <opt>] [-s <size>] <name>
```

**Options:**
- `--label <label>`: Set metadata
- `--opt <opt>`: Driver-specific options
- `-s <size>`: Volume size with K/M/G/T/P suffix

**Anonymous Volumes:**
- Created automatically with `-v /path` or `--mount type=volume,dst=/path`
- Named with UUID pattern: `anon-{36-char-uuid}`
- **Important:** Unlike Docker, anonymous volumes do NOT auto-cleanup with `--rm`

**Examples:**
```bash
# Named volume
container volume create myvolume

# With size
container volume create myvolume -s 10G

# Anonymous volume (auto-created)
container run -v /data alpine

# Reuse anonymous volume
VOL=$(container volume list -q | grep anon)
container run -v $VOL:/data alpine
```

#### `container volume delete (rm)`

Deletes one or more volumes.

**Syntax:**
```bash
container volume delete [--all] [<names> ...]
```

**Options:**
- `-a, --all`: Delete all volumes

**Examples:**
```bash
# Single volume
container volume delete myvolume

# Multiple volumes
container volume delete vol1 vol2 vol3

# All volumes
container volume delete --all
```

#### `container volume prune`

Removes volumes with no container references.

**Syntax:**
```bash
container volume prune
```

Reports actual disk space reclaimed.

#### `container volume list (ls)`

Lists volumes.

**Syntax:**
```bash
container volume list [--format <format>] [--quiet]
```

**Options:**
- `--format <format>`: Output format (json/table, default: table)
- `-q, --quiet`: Only output volume name

#### `container volume inspect`

Displays detailed volume information in JSON.

**Syntax:**
```bash
container volume inspect <names> ...
```

### Registry Management Commands

#### `container registry login`

Authenticates with a registry.

**Syntax:**
```bash
container registry login [--scheme <scheme>] [--password-stdin] [--username <username>] <server>
```

**Options:**
- `--scheme <scheme>`: Connection scheme (http/https/auto, default: auto)
- `--password-stdin`: Read password from stdin
- `-u, --username <username>`: Username

**Example:**
```bash
container registry login registry.example.com
```

#### `container registry logout`

Logs out of a registry.

**Syntax:**
```bash
container registry logout <registry>
```

### System Management Commands

System commands manage the container services, DNS, and kernel.

#### `container system start`

Starts container services.

**Syntax:**
```bash
container system start [--app-root <path>] [--install-root <path>] [--enable-kernel-install] [--disable-kernel-install]
```

**Options:**
- `-a, --app-root <path>`: Application data root
- `--install-root <path>`: Application executables root
- `--enable-kernel-install/--disable-kernel-install`: Kernel installation (default: prompt)

#### `container system stop`

Stops container services and deregisters from launchd.

**Syntax:**
```bash
container system stop [--prefix <prefix>]
```

**Options:**
- `-p, --prefix <prefix>`: Launchd prefix (default: com.apple.container.)

#### `container system status`

Checks if services are running.

**Syntax:**
```bash
container system status [--prefix <prefix>]
```

**Options:**
- `-p, --prefix <prefix>`: Launchd prefix (default: com.apple.container.)

#### `container system version`

Shows version information for CLI and API server.

**Syntax:**
```bash
container system version [--format <format>]
```

**Options:**
- `--format <format>`: Output format (json/table, default: table)

**Table Output:**
```
COMPONENT   VERSION                         BUILD   COMMIT
CLI         1.2.3                           debug   abcdef1
API Server  container-apiserver 1.2.3       release 1234abc
```

**JSON Output:**
```json
{
  "version": "1.2.3",
  "buildType": "debug",
  "commit": "abcdef1",
  "appName": "container CLI",
  "server": {
    "version": "container-apiserver 1.2.3",
    "buildType": "release",
    "commit": "1234abc",
    "appName": "container API Server"
  }
}
```

#### `container system logs`

Displays logs from container services.

**Syntax:**
```bash
container system logs [--follow] [--last <duration>]
```

**Options:**
- `-f, --follow`: Follow log output
- `--last <duration>`: Time period (m/h/d format, default: 5m)

**Example:**
```bash
container system logs --follow --last 10m
```

#### `container system df`

Shows disk usage for images, containers, and volumes.

**Syntax:**
```bash
container system df [--format <format>]
```

**Options:**
- `--format <format>`: Output format (json/table, default: table)

#### `container system dns create`

Creates a local DNS domain. **Requires sudo.**

**Syntax:**
```bash
sudo container system dns create <domain-name>
```

**Example:**
```bash
sudo container system dns create test
container system property set dns.domain test
```

#### `container system dns delete (rm)`

Deletes a local DNS domain. **Requires sudo.**

**Syntax:**
```bash
sudo container system dns delete <domain-name>
```

#### `container system dns list (ls)`

Lists configured local DNS domains.

**Syntax:**
```bash
container system dns list
```

#### `container system kernel set`

Installs or updates the Linux kernel.

**Syntax:**
```bash
container system kernel set [--arch <arch>] [--binary <binary>] [--force] [--recommended] [--tar <tar>]
```

**Options:**
- `--arch <arch>`: Architecture (amd64/arm64, default: arm64)
- `--binary <binary>`: Kernel file path
- `--force`: Overwrite existing kernel
- `--recommended`: Download and install recommended kernel
- `--tar <tar>`: Filesystem path or URL to tar archive

#### `container system property list (ls)`

Lists all system properties with values, types, and descriptions.

**Syntax:**
```bash
container system property list [--format <format>] [--quiet]
```

**Options:**
- `--format <format>`: Output format (json/table, default: table)
- `-q, --quiet`: Only output property ID

**Available Properties:**
- `build.rosetta`: Build amd64 images on arm64 using Rosetta (Bool)
- `dns.domain`: Local DNS domain for containers (String)
- `image.builder`: Builder image reference (String)
- `image.init`: Default initial filesystem image reference (String)
- `kernel.binaryPath`: Kernel binary path in archive (String)
- `kernel.url`: Kernel file or archive URL (String)
- `network.subnet`: Default IPv4 subnet (String)
- `network.subnetv6`: Default IPv6 prefix (String)
- `registry.domain`: Default registry domain (String)

#### `container system property get`

Retrieves a property value.

**Syntax:**
```bash
container system property get <id>
```

**Examples:**
```bash
container system property get registry.domain
container system property get dns.domain
```

#### `container system property set`

Sets a property value.

**Syntax:**
```bash
container system property set <id> <value>
```

**Examples:**
```bash
# Enable Rosetta for AMD64 builds
container system property set build.rosetta true

# Custom DNS domain
container system property set dns.domain mycompany.local

# Custom registry
container system property set registry.domain registry.example.com

# Custom builder image
container system property set image.builder myregistry.com/custom-builder:latest

# Network defaults
container system property set network.subnet 192.168.100.1/24
container system property set network.subnetv6 fd00:abcd::/64
```

#### `container system property clear`

Clears a property (reverts to default).

**Syntax:**
```bash
container system property clear <id>
```

**Examples:**
```bash
container system property clear dns.domain
container system property clear registry.domain
```

## Dockerfile/Containerfile Support

### File Naming

The `container build` command looks for build files in this order:
1. **Dockerfile** (checked first)
2. **Containerfile** (fallback if Dockerfile not found)

You can override with `-f` or `--file` option:
```bash
container build -f Containerfile -t alpine-custom .
```

### Dockerfile Syntax Compatibility

Apple Container uses BuildKit for builds, making it compatible with standard Docker Dockerfile syntax:

**Supported Instructions:**
- `FROM`: Base image specification
- `WORKDIR`: Set working directory
- `RUN`: Execute commands during build
- `CMD`: Default command for container
- `ENTRYPOINT`: Configure container executable
- `COPY`: Copy files from build context
- `ADD`: Add files (with URL and tar extraction support)
- `ENV`: Set environment variables
- `EXPOSE`: Document exposed ports
- `VOLUME`: Document volume mount points
- `USER`: Set user context
- `ARG`: Build-time variables
- `LABEL`: Add metadata

**Example Dockerfile:**
```dockerfile
FROM docker.io/python:alpine
WORKDIR /content
RUN apk add curl
RUN echo '<!DOCTYPE html><html><head><title>Hello</title></head><body><h1>Hello, world!</h1></body></html>' > index.html
CMD ["python3", "-m", "http.server", "80", "--bind", "0.0.0.0"]
```

### Build Context

The build context is the directory specified as the last argument to `container build`:
```bash
container build -t my-app:latest .
# '.' means current directory is the build context
```

Files in the build context can be copied into the image using `COPY` or `ADD` instructions.

### Multi-stage Builds

Supported via `--target` flag:
```bash
container build --target production -t my-app:prod .
```

### Build Arguments

Pass build-time variables:
```bash
container build --build-arg NODE_VERSION=18 --build-arg ENV=production -t my-app .
```

In Dockerfile:
```dockerfile
ARG NODE_VERSION=16
FROM node:${NODE_VERSION}
```

### Build Cache

- Enabled by default
- Disable with `--no-cache` flag
- Use `--pull` to ensure latest base image

### Builder Resource Configuration

Modify builder resources before or during build:
```bash
# Before first build
container builder start --cpus 8 --memory 32g

# Or specify in build command
container build -c 8 -m 32g -t my-app .

# Update existing builder
container builder stop
container builder delete
container builder start --cpus 8 --memory 32g
```

## Networking

### Network Architecture

**macOS 26:**
- Full container-to-container networking
- User-defined networks with isolation
- Default network created automatically
- IPv4 and IPv6 support

**macOS 15 Limitations:**
- Only default network available
- Containers isolated from each other
- No container-to-container communication
- `container network` commands not available

### Default Network

Created automatically when first container starts:
- Name: `default`
- Default subnet: 192.168.64.0/24
- Gateway: 192.168.64.1

### Port Publishing

Forward traffic from host to container:

**Syntax:**
```
[host-ip:]host-port:container-port[/protocol]
```

**Protocol:** `tcp` or `udp` (case insensitive)

**Examples:**
```bash
# IPv4 loopback to container port
container run -d --rm -p 127.0.0.1:8080:8000 node:latest npx http-server -p 8000

# IPv6 loopback to container port
container run -d --rm -p '[::1]:8080:8000' node:latest npx http-server -a :: -p 8000

# All interfaces
container run -d -p 8080:80 nginx:latest

# UDP port
container run -d -p 8080:80/udp my-app
```

Access published ports via localhost:
```bash
curl http://127.0.0.1:8080
curl -6 'http://[::1]:8080'
```

### Socket Publishing

Publish Unix domain sockets:
```bash
container run --publish-socket /host/path:/container/path my-app
```

### DNS Configuration

**Built-in DNS:**
- Embedded DNS service in container
- Resolves container names to IPs
- Configurable DNS domain

**DNS Options:**
- `--dns <ip>`: Nameserver IP address
- `--dns-domain <domain>`: Default DNS domain
- `--dns-option <option>`: DNS options
- `--dns-search <domain>`: Search domains
- `--no-dns`: Disable DNS configuration

**Local DNS Domain Setup:**
```bash
# Create domain (requires sudo)
sudo container system dns create test

# Set as default
container system property set dns.domain test

# Now containers with names are accessible via domain
container run -d --name web nginx:latest
curl http://web.test
```

### Accessing Host Services from Container

Use localhost DNS domain to access host services:

```bash
# Create host access domain (requires sudo)
sudo container system dns create host.container.internal --localhost 203.0.113.113

# Start host service
python3 -m http.server 8000 --bind 127.0.0.1

# Access from container
container run -it --rm alpine/curl curl http://host.container.internal:8000
```

**Recommended IP ranges:**
- Documentation ranges: 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24
- Private range: 172.16.0.0/12

### User-Defined Networks (macOS 26+)

**Create isolated networks:**
```bash
# Basic network
container network create mynet

# With custom subnets
container network create mynet \
  --subnet 192.168.100.0/24 \
  --subnet-v6 fd00:1234::/64
```

**Attach container to network:**
```bash
container run -d --name web --network mynet nginx:latest
```

**Network isolation:**
- Containers on different networks cannot communicate
- Each network has its own subnet
- Default network remains separate

**Configure default subnets:**
```bash
container system property set network.subnet 192.168.100.1/24
container system property set network.subnetv6 fd00:abcd::/64
```

### Custom MAC Addresses

Set custom MAC address for container interface:
```bash
container run --network default,mac=02:42:ac:11:00:02 ubuntu:latest
```

**Requirements:**
- Format: `XX:XX:XX:XX:XX:XX` (colons or hyphens)
- Two least significant bits of first octet must be `10` (locally signed, unicast)

**Auto-generated MACs:**
- First nibble set to `f`: `fX:XX:XX:XX:XX:XX`
- Minimizes conflict with custom addresses

**Verify MAC address:**
```bash
container run --rm --network default,mac=02:42:ac:11:00:02 ubuntu:latest ip addr show eth0
```

### Registry Scheme Configuration

Control how to connect to registries:

**Auto-detection (default):**
```bash
--scheme auto
```

**Auto behavior:**
- Uses HTTP for internal/local registries:
  - Loopback addresses (localhost, 127.*)
  - RFC1918 private IPs (10.*.*.*, 192.168.*.*, 172.16-31.*.*)
  - Hosts ending with default DNS domain
- Uses HTTPS for all other registries

**Force HTTP or HTTPS:**
```bash
container image pull --scheme http registry.local/image:tag
container image pull --scheme https registry.example.com/image:tag
```

## Volume and Mount Support

### Volume Types

1. **Named Volumes:** Explicitly created and managed
2. **Anonymous Volumes:** Auto-created, UUID-named
3. **Bind Mounts:** Direct host directory mounts
4. **tmpfs Mounts:** Temporary filesystem in memory

### Named Volumes

**Create volume:**
```bash
# Basic volume
container volume create myvolume

# With size
container volume create myvolume -s 10G

# With labels and options
container volume create myvolume \
  --label env=production \
  --opt key=value \
  -s 5G
```

**Use volume:**
```bash
container run -v myvolume:/data alpine
```

**List volumes:**
```bash
container volume list
container volume list --format json
```

**Inspect volume:**
```bash
container volume inspect myvolume
```

**Delete volume:**
```bash
container volume delete myvolume
```

### Anonymous Volumes

**Create (auto-named):**
```bash
container run -v /data alpine
```

**Naming pattern:** `anon-{36-character-uuid}`

**Important differences from Docker:**
- Anonymous volumes do NOT auto-cleanup with `--rm` flag
- Manual deletion required
- Must use full UUID name to reuse

**Reuse anonymous volume:**
```bash
# List volumes
VOL=$(container volume list -q | grep anon)

# Reuse volume
container run -v $VOL:/data alpine

# Manual cleanup
container volume rm $VOL
```

### Bind Mounts

**Using --volume flag:**
```bash
# Absolute path required
container run --volume /host/path:/container/path alpine

# With home directory expansion
container run --volume ${HOME}/assets:/content/assets python:alpine

# Read-only mount
container run --volume /host/path:/container/path:ro alpine
```

**Using --mount flag:**
```bash
# Read-write
container run --mount source=/host/path,target=/container/path alpine

# Read-only
container run --mount source=/host/path,target=/container/path,readonly alpine

# With type specification
container run --mount type=bind,source=/host/path,target=/container/path alpine
```

**Important notes:**
- Absolute paths required (no relative paths by default)
- Version 0.8.0+ supports relative paths with `--volume` flag
- Single file mounts not supported (virtiofs limitation)
  - Workaround: Mount parent directory and bind mount file in container

**Example:**
```bash
# Mount directory
container run --volume ${HOME}/Desktop/assets:/content/assets \
  docker.io/python:alpine ls -l /content/assets
```

### tmpfs Mounts

Temporary filesystem in memory:
```bash
# Basic tmpfs
container run --tmpfs /tmp alpine

# Multiple tmpfs mounts
container run --tmpfs /tmp --tmpfs /var/tmp alpine
```

**Use cases:**
- Temporary scratch space
- Sensitive data that shouldn't persist
- Performance-critical temporary storage

### Mount Options Summary

**--volume format:**
```
host-path:container-path[:options]
/host/dir:/container/dir
/host/dir:/container/dir:ro
volume-name:/container/dir
/container/dir  (anonymous volume)
```

**--mount format:**
```
type=<type>,source=<source>,target=<target>[,readonly][,other-options]
```

**Mount types:**
- `bind`: Host directory mount
- `volume`: Named or anonymous volume
- `tmpfs`: Temporary filesystem

### Volume Management

**Prune unused volumes:**
```bash
container volume prune
```

Removes volumes with no container references and reports space reclaimed.

**List with filtering:**
```bash
# All volumes
container volume list

# Quiet (names only)
container volume list -q

# JSON format
container volume list --format json
```

## Environment Variable Passing

### Single Variables

**Using -e or --env flag:**
```bash
container run -e NODE_ENV=production node:18
container run --env DATABASE_URL=postgres://localhost/mydb app:latest
```

**Multiple variables:**
```bash
container run \
  -e NODE_ENV=production \
  -e PORT=8080 \
  -e LOG_LEVEL=debug \
  node:18
```

### Environment File

**Create .env file:**
```bash
# .env
NODE_ENV=production
PORT=8080
DATABASE_URL=postgres://localhost/mydb
API_KEY=secret-key
# This is a comment
LOG_LEVEL=debug
```

**Use environment file:**
```bash
container run --env-file .env node:18
```

**Format:**
- `key=value` format
- Lines starting with `#` are comments
- Blank lines ignored

**Multiple environment files:**
```bash
container run --env-file .env --env-file .env.local node:18
```

### Environment Variables in exec

Override or add variables when executing commands:
```bash
# Single variable
container exec -e DEBUG=1 my-container npm test

# Multiple variables
container exec -e DEBUG=1 -e NODE_ENV=test my-container npm test

# From file
container exec --env-file test.env my-container npm test
```

### Process User and Environment

Set user context with environment:
```bash
# Run as specific user
container run -u 1000:1000 -e HOME=/home/user ubuntu:latest

# By username
container run -u node -e NODE_ENV=production node:18
```

### Build-time Variables

Pass variables during build:
```bash
container build --build-arg VERSION=1.2.3 --build-arg ENV=prod -t app:latest .
```

**In Dockerfile:**
```dockerfile
ARG VERSION=1.0.0
ARG ENV=development

FROM node:18
ENV APP_VERSION=${VERSION}
ENV ENVIRONMENT=${ENV}
```

## Registry Support

### Default Registry

Default registry is Docker Hub. Change default:
```bash
container system property set registry.domain registry.example.com
```

View current default:
```bash
container system property get registry.domain
```

### Authentication

**Interactive login:**
```bash
container registry login registry.example.com
```
Prompts for username and password.

**With username:**
```bash
container registry login -u myusername registry.example.com
```

**Password from stdin:**
```bash
echo "mypassword" | container registry login --password-stdin -u myusername registry.example.com
```

**Credentials storage:**
- Stored in macOS Keychain Services
- Reused for subsequent operations
- Secure storage and retrieval

**Logout:**
```bash
container registry logout registry.example.com
```

### Image Naming

**Full image reference format:**
```
[registry/]repository[:tag|@digest]
```

**Examples:**
```bash
# Docker Hub (default registry)
ubuntu:latest
docker.io/library/ubuntu:latest

# Custom registry
registry.example.com/myapp:v1.0.0
registry.example.com/team/myapp:latest

# With digest
ubuntu@sha256:abc123...

# Full reference
registry.example.com:5000/team/myapp:v1.0.0
```

### Pulling Images

**From Docker Hub:**
```bash
container image pull ubuntu:latest
container image pull docker.io/library/ubuntu:latest
```

**From custom registry:**
```bash
# Login first
container registry login registry.example.com

# Pull image
container image pull registry.example.com/myapp:latest
```

**Platform-specific pull:**
```bash
# Specific architecture
container image pull --arch arm64 ubuntu:latest
container image pull --arch amd64 ubuntu:latest

# Specific platform
container image pull --platform linux/arm64 ubuntu:latest
container image pull --platform linux/amd64 ubuntu:latest
```

### Pushing Images

**Tag for registry:**
```bash
container image tag local-image:latest registry.example.com/user/image:latest
```

**Push to registry:**
```bash
# Login first
container registry login registry.example.com

# Push image
container image push registry.example.com/user/image:latest
```

**Progress display:**
```bash
# With progress (default)
container image push registry.example.com/user/image:latest

# No progress
container image push --progress none registry.example.com/user/image:latest
```

### Multi-platform Images

**Build multi-platform:**
```bash
container build --arch arm64 --arch amd64 \
  -t registry.example.com/user/myapp:latest .
```

**Push multi-platform:**
```bash
# Pushes all architectures
container image push registry.example.com/user/myapp:latest
```

**Pull specific platform:**
```bash
container image pull --platform linux/amd64 registry.example.com/user/myapp:latest
```

**Run specific platform:**
```bash
# ARM64
container run --arch arm64 myapp:latest

# AMD64 (with Rosetta translation)
container run --arch amd64 myapp:latest
```

### Registry Connection Schemes

**Auto-detection (default):**
```bash
container image pull registry.example.com/image:tag
```

**Force HTTP (for local registries):**
```bash
container image pull --scheme http localhost:5000/image:tag
container image push --scheme http localhost:5000/image:tag
```

**Force HTTPS:**
```bash
container image pull --scheme https registry.example.com/image:tag
```

**Auto behavior:**
- HTTP for: localhost, 127.*.*.*, 192.168.*.*, 10.*.*.*, 172.16-31.*.*
- HTTPS for: all other hosts

### Private Registries

**Common registries:**
- Docker Hub: docker.io
- GitHub Container Registry: ghcr.io
- Google Container Registry: gcr.io
- Amazon ECR: <account>.dkr.ecr.<region>.amazonaws.com
- Azure Container Registry: <registry>.azurecr.io

**Example workflows:**

**GitHub Container Registry:**
```bash
# Login (use personal access token)
echo $GITHUB_TOKEN | container registry login ghcr.io -u USERNAME --password-stdin

# Pull
container image pull ghcr.io/owner/image:latest

# Tag and push
container image tag myapp:latest ghcr.io/owner/myapp:latest
container image push ghcr.io/owner/myapp:latest
```

**Docker Hub:**
```bash
# Login
container registry login docker.io

# Or set as default and omit registry name
container image pull username/image:latest
container image push username/image:latest
```

## Known Limitations vs Docker

### Major Functional Gaps

#### 1. CLI Features

**Limited/Missing Commands:**
- No `docker-compose` equivalent
- No orchestration support (Kubernetes, Swarm)
- No plugin system
- No extension marketplace
- No GUI dashboard (command-line only)

**Lifecycle Events:**
- No container events streaming
- Limited logging capabilities compared to Docker

#### 2. Networking Limitations

**macOS 15 Specific:**
- No container-to-container networking
- All containers isolated from each other
- Only default network available
- Cannot create custom networks
- `--network` flag results in error

**General Limitations:**
- No advanced networking features (overlay networks, macvlan)
- No network plugins
- Limited DNS customization compared to Docker

#### 3. Storage and Volumes

**Current Limitations:**
- No volume plugins/drivers
- No volume driver options beyond basic
- Single file mounts not supported (virtiofs limitation)
- Anonymous volumes don't auto-cleanup with `--rm` (unlike Docker)

**Workarounds:**
- For single files: mount parent directory
- For anonymous volumes: manual cleanup required

#### 4. Memory Management

**Memory Ballooning Limitation:**
- VMs cannot fully release memory back to macOS host
- Once allocated, memory remains claimed until container restart
- Can lead to high memory usage with many containers
- Workaround: Periodically restart memory-intensive containers

**Example:**
```bash
# Container may use 2GB but reserves 16GB
container run --memory 16g memory-intensive-app

# Memory won't fully release until restart
container restart memory-intensive-app
```

#### 5. Build System

**Limitations:**
- No BuildKit plugins
- Limited cache management options
- No multi-stage build cache optimization
- Builder requires its own VM (resource overhead)

**Rosetta Translation:**
- AMD64 builds on ARM64 use Rosetta or QEMU
- Performance impact for cross-architecture builds
- Configure with system property:
```bash
# Enable Rosetta (better performance)
container system property set build.rosetta true

# Disable Rosetta (use QEMU)
container system property set build.rosetta false
```

#### 6. Platform Support

**Hardware:**
- Apple Silicon (M-series) ONLY
- No Intel Mac support
- No nested virtualization on M1/M2 (requires M3+)

**Operating System:**
- macOS 26 recommended
- macOS 15 works with severe limitations
- No Linux or Windows support

#### 7. Resource Management

**Default Limits:**
- Containers: 4 CPUs, 1GB RAM (vs Docker's more flexible defaults)
- Builder: 2 CPUs, 2GB RAM
- Must manually configure for resource-intensive workloads

**No Resource Constraints:**
- No CPU shares or weights
- No I/O throttling
- No device cgroup controls
- Limited PID limits configuration

#### 8. Container Runtime

**Missing Features:**
- No Docker Desktop extensions
- No dev containers support (limited)
- No docker-in-docker
- No privileged containers
- Limited capabilities control

**Security:**
- No AppArmor profiles
- No SELinux support
- No seccomp profile customization

#### 9. Image Format

**OCI Compliance:**
- Fully OCI-compatible (images work with Docker)
- Can pull from any OCI registry
- Can push to any OCI registry

**Limitations:**
- No Docker-specific image features
- No buildx features
- No experimental image formats

#### 10. Ecosystem Integration

**Not Available:**
- Docker Compose
- Docker Swarm
- Docker Stack
- Kubernetes integration
- CI/CD integrations (limited)
- IDE integrations (limited)

**Community:**
- Smaller community compared to Docker
- Fewer tutorials and examples
- Limited third-party tooling

### Feature Comparison Table

| Feature | Apple Container | Docker Desktop | Notes |
|---------|----------------|----------------|-------|
| **Architecture** | VM-per-container | Single shared VM | Apple: better isolation |
| **Platform** | Apple Silicon only | Multi-platform | Docker: broader support |
| **macOS 26 Networking** | Full | Full | Feature parity |
| **macOS 15 Networking** | Severely limited | Full | Docker: better compatibility |
| **Container-to-container** | Yes (macOS 26) | Yes | Apple: OS dependent |
| **Multi-container orchestration** | No | Yes (Compose) | Docker: mature tooling |
| **GUI** | No | Yes | Docker: better UX |
| **Extensions** | No | Yes | Docker: rich ecosystem |
| **Volume plugins** | No | Yes | Docker: more flexible |
| **Network plugins** | No | Yes | Docker: advanced networking |
| **Memory ballooning** | Partial | Full | Docker: better resource management |
| **Build performance** | Good (native) | Good | Similar for native arch |
| **Cross-arch builds** | Rosetta/QEMU | QEMU | Apple: Rosetta advantage on ARM |
| **CLI compatibility** | Partial | Full | Docker: more commands |
| **OCI compatibility** | Full | Full | Feature parity |
| **Security isolation** | VM-level | Container-level | Apple: stronger isolation |
| **Resource overhead** | Higher (per-VM) | Lower (shared VM) | Trade-off |
| **Startup time** | Fast | Fast | Similar |
| **Ecosystem** | Emerging | Mature | Docker: established |
| **Open source** | Yes | Partially | Apple: fully open |
| **Native to macOS** | Yes | No | Apple: system integration |

### When to Use Apple Container vs Docker

**Use Apple Container when:**
- Developing on Apple Silicon Macs
- Security/isolation is critical
- Want native macOS integration
- Privacy concerns with data mounting
- Running single-container workloads
- On macOS 26 with full networking support

**Use Docker Desktop when:**
- Need Docker Compose or orchestration
- Require GUI management interface
- Working with multi-container applications
- Need broad ecosystem support
- On macOS 15 or earlier
- Cross-platform development
- Established CI/CD pipelines
- Need extensions or plugins

### Migration Considerations

**Compatible:**
- Dockerfile syntax
- OCI images (pull/push/run)
- Basic container operations
- Volume mounts
- Port publishing
- Environment variables

**Not Compatible:**
- docker-compose.yml files
- Docker-specific CLI flags
- Docker Desktop extensions
- Advanced networking setups (on macOS 15)
- Some volume plugin features

**Migration Steps:**
1. Replace `docker` with `container` in commands
2. Adjust networking for macOS version
3. Manually handle anonymous volume cleanup
4. Configure builder resources if needed
5. Update CI/CD scripts
6. Test multi-container communication thoroughly

## Advanced Features

### SSH Agent Forwarding

Forward macOS SSH authentication socket to container:

**Using --ssh flag:**
```bash
container run -it --rm --ssh alpine:latest sh
```

**Equivalent to:**
```bash
container run -it --rm \
  --volume "${SSH_AUTH_SOCK}:/run/host-services/ssh-auth.sock" \
  --env SSH_AUTH_SOCK=/run/host-services/ssh-auth.sock \
  alpine:latest sh
```

**Benefits of --ssh:**
- Automatic socket path updates on restart
- Persists across logout/login cycles
- No manual path management

**Example usage:**
```bash
# In container
apk add openssh-client git
ssh-add -l
git clone git@github.com:org/private-repo.git
```

### Nested Virtualization

Expose virtualization capabilities to containers.

**Requirements:**
- M3 or newer Apple Silicon Mac
- Linux kernel with virtualization support (KVM)
- macOS 26 or later

**Enable virtualization:**
```bash
container run --virtualization \
  --kernel /path/to/kernel/with/kvm/support \
  ubuntu:latest
```

**Check if enabled:**
```bash
container run --virtualization --kernel /path/to/kernel sh -c "dmesg | grep kvm"
```

**Expected output:**
```
[    0.017245] kvm [1]: IPA Size Limit: 40 bits
[    0.017499] kvm [1]: GICv3: no GICV resource entry
[    0.017685] kvm [1]: vgic interrupt IRQ9
[    0.017893] kvm [1]: Hyp mode initialized successfully
```

**Unsupported platforms:**
```
Error: unsupported: "nested virtualization is not supported on the platform"
```

### Custom Kernel

Use a custom Linux kernel:

**Set recommended kernel:**
```bash
container system kernel set --recommended
```

**From local file:**
```bash
container system kernel set --binary /path/to/kernel --arch arm64
```

**From tar archive:**
```bash
container system kernel set --tar /path/to/archive.tar.xz --binary vmlinux
```

**From remote URL:**
```bash
container system kernel set --tar https://example.com/kernel.tar.xz --binary vmlinux
```

**Force overwrite:**
```bash
container system kernel set --binary /path/to/kernel --force
```

### Working Directory Control

Set initial working directory:
```bash
container run -w /app node:18 npm start
container run --workdir /content python:alpine python server.py
container run --cwd /data alpine ls
```

**With exec:**
```bash
container exec -w /app my-container npm test
```

### Process User Control

**By UID/GID:**
```bash
container run --uid 1000 --gid 1000 ubuntu:latest
```

**By username:**
```bash
container run -u node node:18
container run -u node:node node:18
```

**Format:**
```
-u, --user <user>
  name
  uid
  name:gid
  uid:gid
```

### TTY and Interactive Mode

**Interactive with TTY:**
```bash
container run -it alpine:latest sh
container run -i -t alpine:latest sh
```

**Non-interactive with TTY:**
```bash
container run -t alpine:latest echo "Hello"
```

**Interactive without TTY:**
```bash
container run -i alpine:latest cat
```

### Container Labels

Add metadata to containers:
```bash
container run -l env=production -l version=1.0 -l team=backend nginx:latest
```

**Multiple labels:**
```bash
container run \
  --label env=production \
  --label version=1.0.0 \
  --label maintainer=team@example.com \
  my-app:latest
```

**Query labels:**
```bash
container inspect my-container | jq '.configuration.labels'
```

### Container ID File

Write container ID to file:
```bash
container run -d --cidfile /tmp/mycontainer.cid nginx:latest

# Read container ID
cat /tmp/mycontainer.cid

# Use in scripts
CID=$(cat /tmp/mycontainer.cid)
container stop $CID
```

### Detach Keys

Detach from container without stopping it:
- Default: `Ctrl+P, Ctrl+Q`
- Not configurable in current version

### Shell Completion

Generate completion scripts for your shell:

**Zsh:**
```bash
# With oh-my-zsh
mkdir -p ~/.oh-my-zsh/completions
container --generate-completion-script zsh > ~/.oh-my-zsh/completions/_container
source ~/.oh-my-zsh/completions/_container

# Without oh-my-zsh
fpath=(~/.zsh/completion $fpath)
autoload -U compinit
compinit
mkdir -p ~/.zsh/completion
container --generate-completion-script zsh > ~/.zsh/completion/_container
source ~/.zshrc
```

**Bash:**
```bash
# With bash-completion (homebrew)
container --generate-completion-script bash > /opt/homebrew/etc/bash_completion.d/container
source /opt/homebrew/etc/bash_completion.d/container

# Without bash-completion
mkdir -p ~/.bash_completions
container --generate-completion-script bash > ~/.bash_completions/container
echo "source ~/.bash_completions/container" >> ~/.bash_profile
source ~/.bash_completions/container
```

**Fish:**
```bash
container --generate-completion-script fish > ~/.config/fish/completions/container.fish
```

## Troubleshooting

### Common Issues

#### Network Subnet Mismatch (macOS 15)

**Problem:** Container gets wrong IP address, no network connectivity.

**Diagnosis:**
```bash
# Check bridge before first container
ifconfig | grep bridge

# Create first container
container run -d --name test debian:bookworm

# Check bridge again
ifconfig | grep bridge

# Check container IP
container ls
```

**Solution:**
```bash
# Stop services
container system stop

# Find actual subnet from bridge (e.g., 192.168.66.1)
ifconfig bridge100  # or bridge101, etc.

# Update subnet configuration
defaults write com.apple.container.defaults network.subnet 192.168.66.1/24

# Restart services
container system start

# Verify
container run -d --name test debian:bookworm
container ls
```

#### Memory Not Released

**Problem:** Container memory stays allocated even after processes exit.

**Solution:**
- Restart container to release memory:
```bash
container restart high-memory-container
```

- For stopped containers, start and stop again:
```bash
container start my-container
container stop my-container
```

#### Builder Out of Resources

**Problem:** Build fails with out-of-memory or CPU timeout.

**Solution:**
```bash
# Stop and delete builder
container builder stop
container builder delete

# Restart with more resources
container builder start --cpus 8 --memory 32g

# Retry build
container build -t my-app:latest .
```

#### Cannot Access Container Network (macOS 15)

**Problem:** Container-to-container communication fails.

**Cause:** macOS 15 limitation - containers are isolated.

**Solution:**
- Upgrade to macOS 26, OR
- Use published ports and localhost:
```bash
# Container 1: web server
container run -d --name web -p 8080:80 nginx:latest

# Container 2: access via host
container run --rm alpine/curl curl http://host.container.internal:8080
```

#### vmnet Bug (macOS 26)

**Problem:** Network creation fails if helper apps under Documents or Desktop.

**Temporary Solution:**
- Clone project elsewhere: `~/projects/container`
- Use installed binary: `/usr/local/bin/container`

**Permanent Solution:**
- Wait for Apple to fix vmnet framework bug

#### Permission Denied in Container

**Problem:** Cannot write to mounted volume.

**Cause:** UID/GID mismatch between host and container.

**Solution:**
```bash
# Match host UID/GID
container run -u $(id -u):$(id -g) -v /host/dir:/container/dir alpine touch /container/dir/file

# Or set permissions on host
chmod -R 777 /host/dir
container run -v /host/dir:/container/dir alpine touch /container/dir/file
```

#### Anonymous Volume Cleanup

**Problem:** Anonymous volumes accumulate and waste space.

**Solution:**
```bash
# List anonymous volumes
container volume list | grep anon

# Delete specific anonymous volume
container volume delete anon-xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Prune all unused volumes
container volume prune
```

#### Cannot Pull Image

**Problem:** Failed to pull image from registry.

**Diagnosis:**
```bash
# Check scheme detection
container image pull --progress plain registry.example.com/image:tag

# Try explicit scheme
container image pull --scheme https registry.example.com/image:tag
```

**Solution:**
```bash
# For private registry, login first
container registry login registry.example.com

# For HTTP registry (local)
container image pull --scheme http localhost:5000/image:tag

# For registry auth issues
container registry logout registry.example.com
container registry login registry.example.com
```

### Debug Mode

Enable debug output for all commands:
```bash
export CONTAINER_DEBUG=1
container run ubuntu:latest
```

Or per-command:
```bash
container --debug run ubuntu:latest
```

### System Logs

View container service logs:
```bash
# Recent logs
container system logs

# Follow logs
container system logs --follow

# Last 10 minutes
container system logs --last 10m

# Last hour
container system logs --last 1h
```

### Service Status

Check if services are running:
```bash
container system status

# Check launchd services
launchctl list | grep container
```

### Debug XPC Helpers

Attach debugger to XPC helpers:

```bash
# List services
container system start
container run -d --name test debian:bookworm sleep infinity
launchctl list | grep container

# Set debug label
export CONTAINER_DEBUG_LAUNCHD_LABEL=com.apple.container.container-runtime-linux.test

# Restart and attach debugger
container system start
# Service waits for debugger attachment
```

## Best Practices

### Resource Allocation

**Containers:**
```bash
# Default: 4 CPUs, 1GB RAM
# Adjust based on workload

# Web server
container run --cpus 2 --memory 512M nginx:latest

# Database
container run --cpus 4 --memory 4G postgres:15

# Build/compilation
container run --cpus 8 --memory 8G build-image
```

**Builder:**
```bash
# Default: 2 CPUs, 2GB RAM
# Increase for large builds
container builder start --cpus 4 --memory 8G
```

### Naming Conventions

**Containers:**
```bash
# Use descriptive names
container run --name web-frontend nginx:latest
container run --name db-postgres postgres:15
container run --name cache-redis redis:latest

# Include environment
container run --name prod-api-server api:latest
container run --name dev-web-ui ui:dev
```

**Images:**
```bash
# Use semantic versioning
container build -t myapp:1.0.0 -t myapp:1.0 -t myapp:1 -t myapp:latest .

# Include environment
container build -t myapp:prod .
container build -t myapp:dev .
```

**Networks:**
```bash
# Use purpose-based names
container network create frontend
container network create backend
container network create isolated
```

**Volumes:**
```bash
# Use purpose-based names
container volume create db-data
container volume create app-logs
container volume create shared-cache
```

### Container Lifecycle

**Long-running services:**
```bash
# Use --rm for automatic cleanup
container run -d --rm --name web nginx:latest

# Or explicit cleanup
container run -d --name web nginx:latest
# Later...
container stop web
container delete web
```

**Short-lived tasks:**
```bash
# Always use --rm
container run --rm alpine echo "Hello"
container run --rm -v $(pwd):/work node:18 npm test
```

### Security

**Principle of least privilege:**
```bash
# Run as non-root user
container run -u node node:18 npm start

# Mount volumes read-only when possible
container run -v /host/config:/app/config:ro app:latest
```

**Isolate containers:**
```bash
# Use separate networks for different tiers
container network create frontend
container network create backend

container run --network frontend --name web nginx:latest
container run --network backend --name db postgres:15
```

**Limit resources:**
```bash
# Prevent resource exhaustion
container run --cpus 2 --memory 1G app:latest
```

### Volume Management

**Named volumes for persistence:**
```bash
# Create volume explicitly
container volume create db-data

# Use in containers
container run -v db-data:/var/lib/postgresql/data postgres:15
```

**Bind mounts for development:**
```bash
# Mount source code
container run -v $(pwd):/app -w /app node:18 npm run dev
```

**Clean up regularly:**
```bash
# Stop containers
container stop $(container ls -q)

# Prune volumes
container volume prune

# Prune images
container image prune -a

# Check disk usage
container system df
```

### Networking

**Use custom networks (macOS 26):**
```bash
# Create network
container network create mynet

# Attach containers
container run --network mynet --name web nginx:latest
container run --network mynet --name api api:latest

# Containers can reach each other by name
# From api container:
curl http://web
```

**Publish only necessary ports:**
```bash
# Good: specific interface and port
container run -p 127.0.0.1:8080:80 nginx:latest

# Avoid: all interfaces
container run -p 8080:80 nginx:latest  # accessible from network
```

**Use DNS domains:**
```bash
# Set up domain
sudo container system dns create local
container system property set dns.domain local

# Containers accessible by name
container run -d --name web nginx:latest
curl http://web.local
```

### Building Images

**Layer caching:**
```dockerfile
# Put least-changing layers first
FROM node:18
WORKDIR /app

# Dependencies (cached if package.json unchanged)
COPY package*.json ./
RUN npm ci

# Application code (changes more often)
COPY . .
RUN npm run build

CMD ["npm", "start"]
```

**Multi-stage builds:**
```dockerfile
# Build stage
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

**Build arguments:**
```bash
# Flexible builds
container build \
  --build-arg NODE_VERSION=18 \
  --build-arg ENV=production \
  -t app:prod .
```

### Monitoring

**Regular health checks:**
```bash
# Check container status
container list

# Check resource usage
container stats --no-stream

# Check logs
container logs my-container -n 100

# Check disk usage
container system df
```

**System health:**
```bash
# Service status
container system status

# System logs
container system logs --last 1h
```

## Assumptions & Scope

### Assumptions Made

| Assumption | Confidence | Impact if Wrong |
|------------|------------|-----------------|
| Official documentation is complete and accurate | HIGH | Some commands or options may be missing |
| macOS 26 is the primary target OS | HIGH | Feature availability may differ |
| VM-per-container is the fundamental architecture | HIGH | Performance characteristics may be misunderstood |
| OCI compatibility is full | HIGH | Some image features may not work |
| Docker CLI compatibility is intentional | MEDIUM | Command behavior may differ more than expected |
| Network features on macOS 15 won't be improved | MEDIUM | Networking limitations may change |
| Anonymous volume behavior is intentional | HIGH | Cleanup behavior may change in future |
| Memory ballooning limitation is framework-level | HIGH | May be resolved in future macOS versions |

### Scope Coverage

**Included:**
- All CLI commands and subcommands
- All flags and options from official documentation
- Dockerfile/Containerfile support
- Networking capabilities and limitations
- Volume and mount support
- Environment variable handling
- Image management operations
- Registry support and authentication
- System management features
- Known limitations vs Docker
- Troubleshooting common issues
- Best practices

**Explicitly Excluded:**
- API programming (Swift package usage)
- Building from source (detailed development guide)
- Contributing to the project
- Internal architecture implementation details
- Performance benchmarking
- Comparison with other container runtimes (Podman, containerd)
- Kubernetes integration
- CI/CD-specific integrations

### Uncertainties & Gaps

**Low-confidence areas:**
1. **Future roadmap:** No official roadmap published for missing features
2. **Performance characteristics:** Limited benchmarking data available
3. **Edge cases:** Some command combinations not documented
4. **Plugin system:** Unclear if/when plugin system will be added
5. **Compose alternative:** No indication of Docker Compose equivalent plans

**Information conflicts:**
- Some sources suggest macOS 15 support is experimental vs. official
- Memory ballooning behavior varies across sources
- Network isolation on macOS 15 described differently in various places

**Missing information:**
- Exact OCI spec version compatibility
- Detailed security model documentation
- Performance tuning guidelines
- Advanced troubleshooting for rare edge cases
- Integration testing best practices

### Clarifying Questions for Follow-up

1. **Scope:** Should documentation cover API programming with the Swift package?
2. **Depth:** Is detailed performance benchmarking vs Docker needed?
3. **Comparison:** Should Podman, containerd comparisons be included?
4. **Roadmap:** Should missing features roadmap be researched from GitHub issues?
5. **Examples:** Are more real-world application examples needed (microservices, databases)?
6. **Integration:** Should CI/CD integration examples be included (GitHub Actions, GitLab CI)?
7. **Development:** Should development workflow best practices be expanded?
8. **Security:** Is a dedicated security practices section needed?
9. **Migration:** Should Docker-to-Container migration guide be more detailed?
10. **Troubleshooting:** Should debugging XPC helpers be expanded with more examples?

## References and Sources

### Official Documentation

1. **Apple Container GitHub Repository**
   - URL: https://github.com/apple/container
   - Information: Main repository, README, installation instructions

2. **Command Reference**
   - URL: https://github.com/apple/container/blob/main/docs/command-reference.md
   - Information: Complete CLI command documentation, all flags and options

3. **How-To Guide**
   - URL: https://github.com/apple/container/blob/main/docs/how-to.md
   - Information: Feature usage examples, practical tutorials

4. **Technical Overview**
   - URL: https://github.com/apple/container/blob/main/docs/technical-overview.md
   - Information: Architecture, design decisions, known limitations

5. **Tutorial**
   - URL: https://github.com/apple/container/blob/main/docs/tutorial.md
   - Information: Getting started guide, basic workflows

6. **Building Documentation**
   - URL: https://github.com/apple/container/blob/main/BUILDING.md
   - Information: Build from source, development setup

7. **Releases Page**
   - URL: https://github.com/apple/container/releases
   - Information: Version history, release notes, installers

### Third-Party Analysis

8. **The New Stack - Technical Comparison**
   - URL: https://thenewstack.io/apple-containers-on-macos-a-technical-comparison-with-docker/
   - Information: Docker vs Apple Container comparison, architecture differences

9. **The New Stack - Tutorial**
   - URL: https://thenewstack.io/tutorial-setting-up-and-exploring-apple-containerization-on-macos/
   - Information: Setup guide, practical examples

10. **Medium - Game Changer or Hype**
    - URL: https://medium.com/@dileepapraveen32/apple-native-containers-vs-docker-a-game-changer-or-just-hype-dbab18a675b3
    - Information: Feature comparison, limitations analysis

11. **Medium - Native Container Runtime**
    - URL: https://medium.com/@rpavank2000/apples-container-native-lightweight-container-runtime-for-macos-44a69d57ef41
    - Information: Architecture overview, use cases

12. **Mehdi's Blog - Container Engine**
    - URL: https://blog.mehdio.com/p/apples-new-container-engine-bye-docker
    - Information: Feature analysis, Docker comparison

13. **Medium - Deep Dive**
    - URL: https://chamodshehanka.medium.com/apples-new-containerization-framework-a-deep-dive-into-macos-s-future-for-developers-cf102643394a
    - Information: Framework details, developer perspective

14. **macOS Tahoe Guide**
    - URL: https://macos-tahoe.com/blog/apple-container-vs-docker-developer-guide-2026/
    - Information: 2026 comparison, Swift integration

15. **Apidog - Docker Alternative Guide**
    - URL: https://apidog.com/blog/apple-container-open-source-docker-alternative/
    - Information: Setup, Dockerfile compatibility

16. **DZone - Docker User Perspective**
    - URL: https://dzone.com/articles/what-apples-native-containers-mean-for-docker-user
    - Information: Impact on Docker users, migration considerations

17. **4sysops - Container vs Desktop**
    - URL: https://4sysops.com/archives/apple-container-vs-docker-desktop/
    - Information: Feature comparison, installation guide

18. **4sysops - Installation Guide**
    - URL: https://4sysops.com/archives/install-apple-container-cli-running-containers-natively-on-macos-15-sequoia-and-macos-26-tahoe/
    - Information: Installation on different macOS versions

19. **Medium - Getting Started**
    - URL: https://swapnasagarpradhan.medium.com/getting-started-with-apples-container-cli-on-macos-a-native-alternative-to-docker-fc303e08f5cd
    - Information: Beginner's guide, first steps

20. **InfoQ - Apple Containerization News**
    - URL: https://www.infoq.com/news/2025/06/apple-container-linux/
    - Information: Announcement analysis, industry impact

21. **Medium - Setup Guide macOS 26**
    - URL: https://spaquet.medium.com/how-to-set-up-apple-containerization-on-macos-26-f870cc8c26cd
    - Information: macOS 26 specific setup

22. **Medium - Unboxing & Practice**
    - URL: https://addozhang.medium.com/apple-container-unboxing-practice-17c2c1beded1
    - Information: Hands-on examples, practical usage

### GitHub Issues & Discussions

23. **Single File Mount Support**
    - URL: https://github.com/apple/containerization/issues/79
    - Information: Virtiofs limitation, workarounds

24. **Read-only Container Request**
    - URL: https://github.com/apple/container/issues/990
    - Information: Read-only mount feature discussion

### Recommended for Deep Reading

- **Official Command Reference**: Most comprehensive and authoritative source for CLI commands
- **Technical Overview**: Essential for understanding architecture and design decisions
- **The New Stack Technical Comparison**: Best third-party analysis of differences with Docker
- **How-To Guide**: Practical examples covering most common use cases
- **macOS Tahoe Developer Guide**: Most current 2026-specific information

---

**Document Version:** 1.0
**Last Updated:** 2026-02-07
**Based on:** Apple Container 0.8.0, macOS 26 documentation
**Status:** Comprehensive research completed
