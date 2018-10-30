toolbeltify_prompt() {
    if [ -z "$PS1_BAK" ]; then
    	PS1_BAK=$PS1
	export PS1_BAK
    fi

    local suffix=${PS1_BAK:(-2)}
    PS1="${PS1_BAK::-2}$(__vtex_ps1)$suffix"
    export PS1
}

PROMPT_COMMAND=toolbeltify_prompt
