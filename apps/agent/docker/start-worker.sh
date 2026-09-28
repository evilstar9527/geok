#!/bin/sh
set -eu

mkdir -p /storage/profiles /tmp/oneglanse-profiles

headless_mode="${CAMOUFOX_HEADLESS_MODE:-virtual}"

case "$headless_mode" in
  virtual)
    if [ -z "${DISPLAY:-}" ]; then
      export DISPLAY="${CAMOUFOX_XVFB_DISPLAY:-:99}"
      screen="${CAMOUFOX_XVFB_SCREEN:-1920x1080x24}"
      # A `docker restart` reuses the container filesystem, so the lock and
      # socket left behind by the previous run survive a reboot and make Xvfb
      # abort with "Server is already active for display". Nothing can be
      # serving the display this early in the entrypoint, so clear them.
      x_display="${DISPLAY#*:}"
      rm -f "/tmp/.X${x_display}-lock" "/tmp/.X11-unix/X${x_display}"
      Xvfb "$DISPLAY" -screen 0 "$screen" -ac -nolisten tcp &
      xvfb_pid=$!
      sleep 1
      if ! kill -0 "$xvfb_pid" 2>/dev/null; then
        echo "Xvfb failed to start on $DISPLAY" >&2
        exit 1
      fi
    fi
    ;;
  headful)
    if [ -z "${DISPLAY:-}" ]; then
      echo "CAMOUFOX_HEADLESS_MODE=headful requires DISPLAY to already be set." >&2
      exit 1
    fi
    ;;
  headless)
    ;;
  *)
    echo "Unsupported CAMOUFOX_HEADLESS_MODE: $headless_mode" >&2
    exit 1
    ;;
esac

exec pnpm start:worker
