#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path

def main():
    """Run administrative tasks."""
    try:
        django_path = Path(__file__).resolve().parent
        sys.path.append(str(django_path))
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

        try:
            from django.core.management import execute_from_command_line
        except ImportError as exc:
            raise ImportError(
                "Couldn't import Django. Are you sure it's installed?"
            ) from exc

        # Make migrations and migrate before starting the server
        sys.argv = ['manage.py', 'makemigrations', 'api']
        execute_from_command_line(sys.argv)

        sys.argv = ['manage.py', 'migrate']
        execute_from_command_line(sys.argv)

        # Start the server on port 8000
        sys.argv = ['manage.py', 'runserver', '0.0.0.0:8000']
        execute_from_command_line(sys.argv)
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()