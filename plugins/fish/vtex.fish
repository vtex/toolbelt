function parse_vtex_json
  cat $HOME/.config/configstore/vtex.json | grep $argv[1] | sed -n 's/.*\:.*\"\(.*\)\".*/\1/p'
end

function get_vtex_account
  parse_vtex_json account
end

function get_vtex_env
  parse_vtex_json env
end

function get_vtex_workspace
  parse_vtex_json workspace
end

function prompt_vtex
  if test (get_vtex_workspace 2> /dev/null)
    echo (get_vtex_env):(get_vtex_account)/(get_vtex_workspace)
  end
end
