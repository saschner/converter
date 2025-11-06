from anthropic import Anthropic
import base64
import json
import os

# Initialize Anthropic client
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

def handler(request):
    """
    Vercel serverless function to process receipt images
    """
    
    # Handle CORS for browser requests
    if request.method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            'body': ''
        }
    
    if request.method != 'POST':
        return {
            'statusCode': 405,
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    try:
        # Get the image from request
        body = request.body
        
        # Handle base64 encoded image from JSON
        data = json.loads(body)
        image_base64 = data['image']
        
        # Send to Claude with vision
        message = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_base64,
                        },
                    },
                    {
                        "type": "text",
                        "text": """Extract all items from this receipt and format as CSV data.

Requirements:
- First row must be headers: Item,Quantity,Price,Total
- Each subsequent row is one item
- Include ONLY line items (no subtotals, tax, or final totals)
- If quantity isn't shown, assume 1
- Prices should be numbers only (no $ symbols)
- Return ONLY the CSV data, no explanations or markdown

Example format:
Item,Quantity,Price,Total
Coffee,2,3.50,7.00
Sandwich,1,8.99,8.99"""
                    }
                ],
            }]
        )
        
        # Extract CSV from response
        csv_data = message.content[0].text.strip()
        
        # Remove markdown code blocks if present
        if csv_data.startswith('```'):
            lines = csv_data.split('\n')
            csv_data = '\n'.join(lines[1:-1])
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'text/csv',
                'Access-Control-Allow-Origin': '*',
                'Content-Disposition': 'attachment; filename="receipt.csv"'
            },
            'body': csv_data
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({'error': str(e)})
        }
