#!/bin/bash

# Set base_module variable to the current folder
base_module=$(pwd)

# Check if the current folder does not have an `actions.py` and a `requirements.txt` file
if [[ ! -f "actions.py" || ! -f "requirements.txt" ]]; then
    # Set base_module to the parent folder's "base-module/renjs" folder
    base_module=$(dirname "$base_module")/base-modules/renjs
fi

# Define functions for each action
run_server() {
    echo "Running localhost server..."
    # Replace this command with your actual command to run the localhost server
    python3 $base_module/actions.py webserver
}

install_requirements() {
    echo "Installing requirements..."
    # Replace this command with your actual command to install requirements
    python3 -m pip install -r $base_module/requirements.txt
}

pack() {
    echo "Packing..."
    # Replace this command with your actual command to pack
    # Example: tar -czvf archive.tar.gz $base_module
    python3 $base_module/actions.py pack
}

# Main menu function
main_menu() {
    echo "Menu:"
    echo "1. Run localhost server"
    echo "2. Install requirements"
    echo "3. Pack storyline"
    echo "4. Exit"

    read -p "Enter your choice: " choice

    case $choice in
        1) run_server ;;
        2) install_requirements ;;
        3) pack ;;
        4) exit ;;
        *) echo "Invalid choice. Please enter a number from 1 to 4." ;;
    esac

    # Prompt for another action until user chooses to exit
    main_menu
}

# Call the main_menu function to start the script
main_menu
