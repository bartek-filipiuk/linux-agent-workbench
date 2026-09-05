// Policy gate client for the bash DEBUG trap. One static binary instead of a Node start-up per
// simple command (tens of milliseconds and ~40 MB each). Fail-closed: any error, timeout or
// unreadable reply denies the command. Wire protocol (unchanged): one JSON line
//   {"command": "...", "cwd": "...", "pid": <parent pid>}
// to /run/law/gate.sock, one JSON line back with "decision":"allow"|"deny" and optional "reason".
#include <errno.h>
#include <poll.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>

static int deny(const char *reason) {
  fprintf(stderr, "law: command blocked: %s\n", reason);
  return 1;
}

// Appends s to *buf as a JSON string body (no surrounding quotes), growing the buffer as needed.
static int append_escaped(char **buf, size_t *len, size_t *cap, const char *s) {
  for (const unsigned char *p = (const unsigned char *)s; *p; p++) {
    char tmp[8];
    const char *piece = tmp;
    size_t n;
    if (*p == '"') { piece = "\\\""; n = 2; }
    else if (*p == '\\') { piece = "\\\\"; n = 2; }
    else if (*p == '\n') { piece = "\\n"; n = 2; }
    else if (*p == '\r') { piece = "\\r"; n = 2; }
    else if (*p == '\t') { piece = "\\t"; n = 2; }
    else if (*p < 0x20) { n = (size_t)snprintf(tmp, sizeof tmp, "\\u%04x", *p); }
    else { tmp[0] = (char)*p; n = 1; }
    if (*len + n + 1 > *cap) {
      size_t ncap = (*cap ? *cap * 2 : 4096);
      while (*len + n + 1 > ncap) ncap *= 2;
      char *nb = realloc(*buf, ncap);
      if (!nb) return -1;
      *buf = nb;
      *cap = ncap;
    }
    memcpy(*buf + *len, piece, n);
    *len += n;
    (*buf)[*len] = 0;
  }
  return 0;
}

static int append_raw(char **buf, size_t *len, size_t *cap, const char *s) {
  size_t n = strlen(s);
  if (*len + n + 1 > *cap) {
    size_t ncap = (*cap ? *cap * 2 : 4096);
    while (*len + n + 1 > ncap) ncap *= 2;
    char *nb = realloc(*buf, ncap);
    if (!nb) return -1;
    *buf = nb;
    *cap = ncap;
  }
  memcpy(*buf + *len, s, n);
  *len += n;
  (*buf)[*len] = 0;
  return 0;
}

int main(int argc, char **argv) {
  if (argc < 2) return 0;
  // Join argv like the Node client did.
  size_t clen = 0;
  for (int i = 1; i < argc; i++) clen += strlen(argv[i]) + 1;
  char *command = malloc(clen + 1);
  if (!command) return deny("out of memory");
  command[0] = 0;
  for (int i = 1; i < argc; i++) { if (i > 1) strcat(command, " "); strcat(command, argv[i]); }
  int only_space = 1;
  for (char *p = command; *p; p++) if (*p != ' ' && *p != '\t') { only_space = 0; break; }
  if (only_space) return 0;

  const char *sock = getenv("LAW_GATE_SOCKET");
  if (!sock || !*sock) sock = "/run/law/gate.sock";
  long timeout_ms = 605000;
  const char *t = getenv("LAW_GATE_TIMEOUT_MS");
  if (t && *t) { long v = strtol(t, NULL, 10); if (v > 0) timeout_ms = v; }

  char cwd[4096];
  if (!getcwd(cwd, sizeof cwd)) strcpy(cwd, "/");

  char *req = NULL; size_t len = 0, cap = 0;
  char pid[32];
  snprintf(pid, sizeof pid, "%ld", (long)getppid());
  if (append_raw(&req, &len, &cap, "{\"command\":\"") || append_escaped(&req, &len, &cap, command) ||
      append_raw(&req, &len, &cap, "\",\"cwd\":\"") || append_escaped(&req, &len, &cap, cwd) ||
      append_raw(&req, &len, &cap, "\",\"pid\":") || append_raw(&req, &len, &cap, pid) || append_raw(&req, &len, &cap, "}\n"))
    return deny("out of memory");

  int fd = socket(AF_UNIX, SOCK_STREAM, 0);
  if (fd < 0) return deny("gate unavailable (socket)");
  struct sockaddr_un addr;
  memset(&addr, 0, sizeof addr);
  addr.sun_family = AF_UNIX;
  strncpy(addr.sun_path, sock, sizeof addr.sun_path - 1);
  if (connect(fd, (struct sockaddr *)&addr, sizeof addr) < 0) return deny("gate unavailable (connect)");

  for (size_t off = 0; off < len;) {
    ssize_t w = write(fd, req + off, len - off);
    if (w < 0) { if (errno == EINTR) continue; return deny("gate unavailable (write)"); }
    off += (size_t)w;
  }

  char reply[8192];
  size_t rlen = 0;
  for (;;) {
    struct pollfd pfd = { .fd = fd, .events = POLLIN };
    int pr = poll(&pfd, 1, (int)timeout_ms);
    if (pr == 0) return deny("approval timed out");
    if (pr < 0) { if (errno == EINTR) continue; return deny("gate unavailable (poll)"); }
    ssize_t r = read(fd, reply + rlen, sizeof reply - 1 - rlen);
    if (r < 0) { if (errno == EINTR) continue; return deny("gate unavailable (read)"); }
    if (r == 0) return deny("gate closed");
    rlen += (size_t)r;
    reply[rlen] = 0;
    if (memchr(reply, '\n', rlen)) break;
    if (rlen >= sizeof reply - 1) return deny("bad gate reply");
  }

  if (strstr(reply, "\"decision\":\"allow\"")) return 0;
  const char *rs = strstr(reply, "\"reason\":\"");
  if (!rs) return deny("denied by policy");
  rs += strlen("\"reason\":\"");
  char reason[1024];
  size_t n = 0;
  for (; *rs && *rs != '"' && n < sizeof reason - 1; rs++) {
    if (*rs == '\\' && rs[1]) { rs++; reason[n++] = (*rs == 'n') ? ' ' : *rs; continue; }
    reason[n++] = *rs;
  }
  reason[n] = 0;
  return deny(n ? reason : "denied by policy");
}
