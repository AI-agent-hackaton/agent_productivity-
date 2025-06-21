import os
from dotenv import load_dotenv
import json

import uvicorn
from typing import List

from aci import ACI
from aci.meta_functions import ACISearchFunctions
from aci.types.functions import FunctionDefinitionFormat
from openai import OpenAI
from elevenlabs.client import ElevenLabs

load_dotenv()

openai = OpenAI()

aci = ACI()


client = OpenAI()
audio_file = open("/path/to/file/speech.mp3", "rb")

transcription = client.audio.transcriptions.create(
    model="gpt-4o-transcribe", 
    file=audio_file, 
    response_format="text"
)

print(transcription.text)

elevenlabs = ElevenLabs(
  api_key=os.getenv("ELEVENLABS_API_KEY"),)

prompt = (
    "You are a helpful assistant with access to a unlimited number of tools via a meta function: "
    "ACI_SEARCH_FUNCTIONS"
    "You can use ACI_SEARCH_FUNCTIONS to find relevant functions across all apps."
    "Once you have identified the functions you need to use, you can append them to the tools list and use them in future tool calls."
)

tools_meta = [
    ACISearchFunctions.to_json_schema(FunctionDefinitionFormat.OPENAI),
]

tools_retrieved: list[dict] = []

load_dotenv()

app = FastAPI()

def user_query(user_input):
    chat_history: list[dict] = []

    while True:
        print("Waiting for LLM Output")
        response = openai.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {
                    "role": "system",
                    "content": prompt,
                },
                {
                    "role": "user",
                    "content": user_input,
                },
            ]
            + chat_history,
            tools=tools_meta + tools_retrieved,
            # tool_choice="required",  # force the model to generate a tool call
            parallel_tool_calls=True,
        )

        # Process LLM response and potential function call (there can only be at most one function call)
        content = response.choices[0].message.content
        tool_call = (
            response.choices[0].message.tool_calls[0]
            if response.choices[0].message.tool_calls
            else None
        )
        if content:
            print("LLM Message")
            print(content)
            chat_history.append({"role": "assistant", "content": content})

        # Handle function call if any
        if tool_call:
            print(f"Function Call: {tool_call.function.name}")
            
            print(f"arguments: {tool_call.function.arguments}")

            chat_history.append({"role": "assistant", "tool_calls": [tool_call]})

            result = aci.handle_function_call(
                tool_call.function.name,
                json.loads(tool_call.function.arguments),
                linked_account_owner_id="John_doe",
                allowed_apps_only=True,
                format=FunctionDefinitionFormat.OPENAI,
            )
            # if the function call is a get, add the retrieved function definition to the tools_retrieved
            if tool_call.function.name == ACISearchFunctions.get_name():
                tools_retrieved.extend(result)

            print(f"Result type: {type(result)}")
            print(f"Result: {result}")

            chat_history.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result),
                }
            )
        else:
            # If there's no further function call, exit the loop
            print("Task Completed")
            break


if __name__ == "__main__":
    user_query("Can you use notion to get the latest issues?")