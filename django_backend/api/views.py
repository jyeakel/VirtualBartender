from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Drink, ChatSession
from .serializers import DrinkSerializer, ChatSessionSerializer
import openai
from django.conf import settings
import os
import json

# the newest OpenAI model is "gpt-4o" which was released May 13, 2024
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

        # Build the context message based on session data
        context_info = ""
        if session:
            if session.location:
                context_info += f"\nCurrent weather: {session.location.get('weather', 'unknown')}"
            if session.preferences:
                context_info += f"\nUser preferences: {json.dumps(session.preferences)}"

        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": f"""You are a friendly and knowledgeable virtual bartender. Help users discover drink recommendations based on their preferences, mood, and current weather conditions. Always respond with JSON output.

Context:{context_info}

Your response must be a valid JSON object with this structure:
{{
    "role": "assistant",
    "content": "your friendly message here",
    "options": ["option1", "option2"],  // optional array of choices for the user
    "recommendations": [  // optional array of drink recommendations
        {{
            "id": number,
            "name": string,
            "description": string,
            "ingredients": [{{ "name": string, "amount": string }}]
        }}
    ]
}}"""
                },
                {
                    "role": "user", 
                    "content": f"Respond with JSON to: {message}"
                }
            ],
            response_format={"type": "json_object"}
        )

        chat_response = json.loads(response.choices[0].message.content)

        # Add session_id to the response if available
        if session and session_id:
            chat_response['session_id'] = session_id

        return Response(chat_response)
    except Exception as e:
        print("Chat error:", str(e))
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