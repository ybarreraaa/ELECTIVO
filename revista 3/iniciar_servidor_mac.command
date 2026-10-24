#!/bin/zsh
cd "$(dirname "$0")"
echo "Iniciando servidor web local en http://localhost:8080 (Sin necesidad de XAMPP)..."
open "http://localhost:8080/index.html"
python3 -m http.server 8080
