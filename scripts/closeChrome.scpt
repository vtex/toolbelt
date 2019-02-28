-- Check if app is running
on is_running(appName)
	tell application "System Events" to (name of processes) contains appName
end is_running

on run argv
	-- Check if chrome is running
	set chromeRunning to is_running("Google Chrome")
	-- Set URL to the one given in arguments
	set lookupUrl to item 1 of argv

	-- Engine
	if chromeRunning then
		tell application "Google Chrome"
			set i to 0
			set j to 0
			repeat with w in (windows)
				set j to j + 1
				repeat with t in (tabs of w)
					set i to i + 1
					if (t's URL as string) contains lookupUrl then
						tell t to close
						tell w to activate

						set (active tab index of window j) to i
						return
					end if
				end repeat
			end repeat
		end tell
	end if
end run