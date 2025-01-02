from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.fields import JSONField

class Drink(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    instructions = models.TextField()
    ingredients = models.JSONField()
    tags = ArrayField(models.CharField(max_length=50))
    image_url = models.URLField(null=True, blank=True)
    recommended_time = ArrayField(models.CharField(max_length=50), null=True)
    recommended_weather = ArrayField(models.CharField(max_length=50), null=True)

    def __str__(self):
        return self.name

class ChatSession(models.Model):
    session_id = models.CharField(max_length=100, unique=True)
    location = models.JSONField(null=True)
    preferences = models.JSONField(null=True)
    recommendations = models.JSONField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Session {self.session_id}"
