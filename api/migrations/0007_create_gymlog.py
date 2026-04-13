# Generated manually to add GymLog model

import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_add_avatar_url'),
    ]

    operations = [
        migrations.CreateModel(
            name='GymLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('time_in', models.DateTimeField()),
                ('time_out', models.DateTimeField(blank=True, null=True)),
                ('date', models.DateField()),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='gym_logs', to='api.user')),
            ],
            options={
                'ordering': ['-time_in'],
            },
        ),
    ]