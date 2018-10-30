###############################################################################
#                                   GLOBALS                                   #
###############################################################################

export TOOLBELT_PROMPT_ACTIVE=true
export TOOLBELT_PROMPT_COLOR=colorful
TOOLBELT_CFG_FILE="$HOME/.config/configstore/vtex.json"


###############################################################################
#                                   HELPERS                                   #
###############################################################################

parse_vtex_json() {
    cat "$TOOLBELT_CFG_FILE" | grep $1 | sed -n "s/^.*\"$1\": \"\(.*\)\".*$/\1/p"
}

get_vtex_account() {
    parse_vtex_json "account"
}

get_vtex_workspace() {
    parse_vtex_json "workspace"
}


###############################################################################
#                                     CORE                                    #
###############################################################################

__vtex_ps1() {
    local account=$(get_vtex_account)
    local workspace=$(get_vtex_workspace)

    local white="\[\e[37m\]"
    local blue="\[\e[34m\]"
    local darkred="\[\e[1;31m\]"
    local default="\[\e[39m\]"

    if [ "$TOOLBELT_PROMPT_COLOR" == "light" ]; then
        local parenthesis=$white
        local vtex=$white
        local dynamic=$white
        local symbols=$white
    elif [ "$TOOLBELT_PROMPT_COLOR" == "dark" ]; then
        local parenthesis=$blue
        local vtex=$blue
        local dynamic=$blue
        local symbols=$blue
    else
        local parenthesis=$darkred
        local vtex=$darkred
        local dynamic=$white
        local symbols=$darkred
    fi

    if [ -n "$account" ] || [ -n "$workspace" ]; then
    	echo -e "${parenthesis}(${vtex}vtex${symbols}: ${dynamic}$account${symbols}@${dynamic}$workspace${parenthesis})${default} "
    fi
}
