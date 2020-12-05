#!/bin/bash

# Prevent running in case of failures
set -euf -o pipefail

CURR_PATH=$(pwd)
echo "Your path $CURR_PATH"

[[ -d config ]] || mkdir config

CONFIG_PATH="config/template_gen"

if [[ -f "$CONFIG_PATH" ]]; then

    source "$CONFIG_PATH"

fi

PORT=${PORT:-"8000"}
read -rp "Nginx port ($PORT) >> " PORT_INPUT
PORT=${PORT_INPUT:-"$PORT"}

NGINX_HOSTNAME=${NGINX_HOSTNAME:-"127.0.0.1"}
read -rp "Service hostname ($NGINX_HOSTNAME) >> " NGINX_HOSTNAME_INPUT
NGINX_HOSTNAME=${NGINX_HOSTNAME_INPUT:-"$NGINX_HOSTNAME"}

ADDITIONAL_NGINX_HOSTNAMES=${ADDITIONAL_NGINX_HOSTNAMES:-""}
read -rp "Additional hostnames ($ADDITIONAL_NGINX_HOSTNAMES) >> " ADDITIONAL_NGINX_HOSTNAMES_INPUT
ADDITIONAL_NGINX_HOSTNAMES=${ADDITIONAL_NGINX_HOSTNAMES_INPUT:-"$ADDITIONAL_NGINX_HOSTNAMES"}

SLUDGE_PORT=${SLUDGE_PORT:-"8001"}
read -rp "Sludge port ($SLUDGE_PORT) >> " SLUDGE_PORT_INPUT
SLUDGE_PORT=${SLUDGE_PORT_INPUT:-"$SLUDGE_PORT"}

cat << EOF > "$CONFIG_PATH"
PORT="$PORT"
NGINX_HOSTNAME="$NGINX_HOSTNAME"
ADDITIONAL_NGINX_HOSTNAMES="$ADDITIONAL_NGINX_HOSTNAMES"
SLUDGE_PORT="$SLUDGE_PORT"
EOF

sed -e "s@{{port}}@$PORT@g" \
    -e "s@{{server_name}}@$NGINX_HOSTNAME $ADDITIONAL_NGINX_HOSTNAMES@g" \
    -e "s@{{project_path}}@$CURR_PATH@g" \
    -e "s@{{sludge_port}}@$SLUDGE_PORT@g" \
    templates/splutter_nginx.conf.template > config/splutter_nginx.conf

ENV=${1:-"prod"}

if [[ "$ENV" == "dev" ]]; then

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then

        if [[ -f "/etc/nginx/sites-enabled/splutter_nginx.conf" ]]; then

            sudo rm "/etc/nginx/sites-enabled/splutter_nginx.conf"

        fi
        
        # Symlink the nginx conf file
        sudo ln -s "$CURR_PATH/config/splutter_nginx.conf" \
            "/etc/nginx/sites-enabled/"

        # Restart nginx to enable conf file
        sudo service nginx restart

    elif [[ "$OSTYPE" == "darwin"* ]]; then

        if [[ -f "/usr/local/etc/nginx/servers/splutter_nginx.conf" ]]; then

            rm "/usr/local/etc/nginx/servers/splutter_nginx.conf"

        fi

        # Symlink the nginx conf file
        ln -s "$CURR_PATH/config/splutter_nginx.conf" \
            "/usr/local/etc/nginx/servers/"

        # Restart nginx to enable conf file
        brew services restart nginx

    else
    
        echo "Unknown OS"
    
    fi

elif [[ "$ENV" == "prod" ]]; then

    if [[ -f "/etc/nginx/sites-enabled/splutter_nginx.conf" ]]; then

        sudo rm "/etc/nginx/sites-enabled/splutter_nginx.conf"

    fi
    
    # Symlink the nginx conf file
    sudo ln -s "$CURR_PATH/config/splutter_nginx.conf" \
        "/etc/nginx/sites-enabled/"

    # Restart nginx to enable conf file
    sudo service nginx restart

else
    
    echo "Unknown arg: $ENV"

fi

