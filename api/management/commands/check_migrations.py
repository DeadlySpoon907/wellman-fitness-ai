from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Check migration status and database tables'

    def handle(self, *args, **options):
        self.stdout.write('Checking migration status...')

        # Check applied migrations
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT app, name, applied
                FROM django_migrations
                ORDER BY app, applied;
            """)
            migrations = cursor.fetchall()

        self.stdout.write('\nApplied migrations:')
        for app, name, applied in migrations:
            status = '✓' if applied else '✗'
            self.stdout.write(f'  {status} {app}.{name}')

        # Check if gym_logs table exists
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_name = 'api_gymlog'
                );
            """)
            table_exists = cursor.fetchone()[0]

        if table_exists:
            self.stdout.write('\n✓ api_gymlog table exists')

            # Check table structure
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'api_gymlog'
                ORDER BY ordinal_position;
            """)
            columns = cursor.fetchall()

            self.stdout.write('Table structure:')
            for col_name, data_type, is_nullable in columns:
                nullable = 'NULL' if is_nullable == 'YES' else 'NOT NULL'
                self.stdout.write(f'  {col_name}: {data_type} {nullable}')
        else:
            self.stdout.write('\n✗ api_gymlog table does NOT exist')

        self.stdout.write('\nMigration check completed.')