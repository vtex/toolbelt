toolbeltify_prompt() {
    if [ -z "$PS1_BAK" ]; then
    	PS1_BAK=$PS1
      export PS1_BAK
    fi

    local len=${#PS1_BAK}
    local prefix="${PS1_BAK:0:($len - 3)}"
    local suffix="${PS1_BAK: -3}"
    PS1="$prefix $(__vtex_ps1)$suffix"
    export PS1
}

PROMPT_COMMAND=toolbeltify_prompt
