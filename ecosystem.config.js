module.exports = {
  apps: [
    {
      name: "smartview-backend",
      script: "./backend/dist/server.js",
      cwd: "/home/smartviewlounge/smart-view-lounge",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
      // Give the process 10 seconds to gracefully shut down before SIGKILL
      kill_timeout: 10000,
      // Wait for process to send 'ready' signal or 3 seconds
      wait_ready: true,
      listen_timeout: 10000,
    },
    {
      name: "smartview-frontend",
      script: "npm",
      args: "start",
      cwd: "/home/smartviewlounge/smart-view-lounge/frontend",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
      kill_timeout: 5000,
    }
  ]
};
