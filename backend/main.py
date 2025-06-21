import os
from dotenv import load_dotenv
import json

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List
from rich import print as rprint
from rich.panel import Panel

from aci import ACI
from aci.meta_functions import ACISearchFunctions
from aci.types.functions import FunctionDefinitionFormat
from openai import OpenAI
import requests

load_dotenv()
LINKED_ACCOUNT_OWNER_ID = "John_doe"

openai = OpenAI()

aci = ACI()

prompt = (
    "You are a helpful assistant with access to a unlimited number of tools via a meta function: "
    "ACI_SEARCH_FUNCTIONS"
    "You can use ACI_SEARCH_FUNCTIONS to find relevant functions across all apps."
    "Once you have identified the functions you need to use, you can append them to the tools list and use them in future tool calls."
)

load_dotenv()

app = FastAPI()

# Add CORS middleware to allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    message: str

# Response model
class ChatResponse(BaseModel):
    response: str

@app.get("/")
def root():
    return JSONResponse(content={"response": "Hello World"})

@app.post("/user_query")
def user_query(user_input: ChatMessage):
    # ACI meta functions for the LLM to discover the available executable functions dynamically
    tools_meta = [
        ACISearchFunctions.to_json_schema(FunctionDefinitionFormat.OPENAI),
    ]
    # store retrieved function definitions (via meta functions) that will be used in the next iteration,
    # can dynamically append or remove functions from this list
    tools_retrieved: list[dict] = []

    chat_history: list[dict] = []

    while True:
        rprint(Panel("Waiting for LLM Output", style="bold blue"))
        response = openai.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {
                    "role": "system",
                    "content": prompt,
                },
                {
                    "role": "user",
                    "content": user_input.message,
                },
            ]
            + chat_history,
            tools=tools_meta + tools_retrieved,
            # tool_choice="required",  # force the model to generate a tool call
            parallel_tool_calls=False,
        )

        # Process LLM response and potential function call (there can only be at most one function call)
        content = response.choices[0].message.content
        tool_call = (
            response.choices[0].message.tool_calls[0]
            if response.choices[0].message.tool_calls
            else None
        )
        if content:
            rprint(Panel("LLM Message", style="bold green"))
            rprint(content)
            chat_history.append({"role": "assistant", "content": content})

        # Handle function call if any
        if tool_call:
            rprint(
                Panel(f"Function Call: {tool_call.function.name}", style="bold yellow")
            )
            rprint(f"arguments: {tool_call.function.arguments}")

            chat_history.append({"role": "assistant", "tool_calls": [tool_call]})
            result = aci.handle_function_call(
                tool_call.function.name,
                json.loads(tool_call.function.arguments),
                linked_account_owner_id=LINKED_ACCOUNT_OWNER_ID,
                allowed_apps_only=True,
                format=FunctionDefinitionFormat.OPENAI,
            )
            # if the function call is a get, add the retrieved function definition to the tools_retrieved
            if tool_call.function.name == ACISearchFunctions.get_name():
                tools_retrieved.extend(result)

            rprint(Panel("Function Call Result", style="bold magenta"))
            rprint(result)
            # Continue loop, feeding the result back to the LLM for further instructions
            chat_history.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result),
                }
            )
        else:
            # If there's no further function call, exit the loop
            final_response = response.choices[0].message.content

            import requests
            url = "http://localhost:7868/api/v1/run/b8272446-bcaa-41ee-bfed-2257eafdc38a?stream=false"  # The complete API endpoint URL for this flow

            # Request payload configuration
            payload = {
                "input_value": str(final_response),  # The input value to be processed by the flow
                "output_type": "chat",  # Specifies the expected output format
                "input_type": "chat"  # Specifies the input format
            }

            # Request headers
            headers = {
                "Content-Type": "application/json"
            }

            try:
                # Send API request
                response = requests.request("POST", url, json=payload, headers=headers)
                response.raise_for_status()  # Raise exception for bad status codes

                # Print response
                response_data = response.json()
                messages = []
                for output in response_data.get("outputs", []):
                    for inner_output in output.get("outputs", []):
                        for message in inner_output.get("messages", []):
                            messages.append(message.get("message"))
                
                markdown_messages = "\n".join(f"{msg}" for msg in messages if msg)

            except requests.exceptions.RequestException as e:
                print(f"Error making API request: {e}")
            except ValueError as e:
                print(f"Error parsing response: {e}")

            print(final_response)  
            rprint(Panel("Task Completed", style="bold green"))

            return JSONResponse(content={"response": "## Results: " + f"\n" + final_response + f"\n" + f"## Draft Message and To do List: \n {markdown_messages}"})


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
