import os
import time

print("Starting poll...")
while os.path.exists("/proc/129"):
    time.sleep(5)
print("Claude PID 129 has exited.")
while os.path.exists("/proc/127"):
    time.sleep(1)
print("Runner PID 127 has exited.")
