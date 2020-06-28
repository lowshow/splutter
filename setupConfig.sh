#!/bin/bash

# Prevent running in case of failures
set -euf -o pipefail

CURR_PATH=$(pwd)
echo "Your path $CURR_PATH"

[[ -d config ]] || mkdir config

read -rp "Nginx port >> " PORT
read -rp "Service hostname >> " HOSTNAME
read -rp "Additional hostnames >> " ADDITIONAL_HOSTNAMES
read -rp "Sludge port >> " SLUDGE_PORT

sed -e "s@{{port}}@$PORT@g" \
    -e "s@{{server_name}}@$HOSTNAME $ADDITIONAL_HOSTNAMES@g" \
    -e "s@{{project_path}}@$CURR_PATH@g" \
    -e "s@{{sludge_port}}@$SLUDGE_PORT@g" \
    templates/splutter_nginx.conf.template > config/splutter_nginx.conf

# Symlink the nginx conf file
sudo ln -s "$CURR_PATH/config/splutter_nginx.conf" \
    "/etc/nginx/sites-enabled/"

# Restart nginx to enable conf file
sudo service nginx restart