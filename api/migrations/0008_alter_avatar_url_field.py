from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_create_gymlog'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='avatar_url',
            field=models.TextField(blank=True, null=True),
        ),
    ]