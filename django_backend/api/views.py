from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Drink, ChatSession
from .serializers import DrinkSerializer, ChatSessionSerializer
import openai
from django.conf import settings
import os

openai.api_key = os.environ.get('OPENAI_API_KEY')

@api_view(['POST'])
def chat(request):
    try:
        message = request.data.get('message')
        session_id = request.data.get('session_id')
        
        session = ChatSession.objects.filter(session_id=session_id).first()
        
        if not session and message == "start":
            session = ChatSession.objects.create(
                session_id=session_id or os.urandom(16).hex()
            )
        
        response = openai.ChatCompletion.create(
            model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024
            messages=[
                {
                    "role": "system",
                    "content": "You are a friendly and knowledgeable virtual bartender. Help users discover drink recommendations based on their preferences, mood, and current weather conditions."
                },
                {"role": "user", "content": message}
            ],
            response_format={"type": "json_object"}
        )
        
        return Response(response.choices[0].message.content)
    except Exception as e:
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def weather(request, zip_code):
    try:
        # Mock weather data for now
        return Response({
            "temperature": 72,
            "condition": "sunny"
        })
    except Exception as e:
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class DrinkViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Drink.objects.all()
    serializer_class = DrinkSerializer
