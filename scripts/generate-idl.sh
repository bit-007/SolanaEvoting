

#!/bin/bash

# This script helps generate and place the IDL file correctly

# Make sure we're in the project root
if [ ! -f "Anchor.toml" ]; then
    echo "Error: Must run from the project root directory (where Anchor.toml is located)"
    exit 1
fi

# Get program name from Anchor.toml
PROGRAM_NAME=$(grep -o 'solana_evoting = "[^"]*"' Anchor.toml | head -1 | cut -d ' ' -f 1 | cut -d '_' -f 2-)
PROGRAM_NAME=${PROGRAM_NAME:-solana_evoting}  # Default if not found

echo "Detected program name: $PROGRAM_NAME"

# Create IDL directories
mkdir -p target/idl
mkdir -p target/types

# Check if build directory exists
if [ ! -d "target/release/build" ]; then
    echo "Building program first..."
    anchor build
fi

# Try to extract IDL from build artifacts
echo "Extracting IDL from build artifacts..."

# Method 1: Find IDL in build directory
IDL_FILE=$(find target/release/build -name "$PROGRAM_NAME.json" -type f 2>/dev/null)

if [ -n "$IDL_FILE" ]; then
    echo "Found IDL file at: $IDL_FILE"
    cp "$IDL_FILE" "target/idl/$PROGRAM_NAME.json"
    cp "$IDL_FILE" "target/types/$PROGRAM_NAME.ts"
    echo "IDL file copied to target/idl and target/types"
else
    echo "Could not find IDL file in build directory. Trying alternative methods..."
    
    # Method 2: Generate from program binary using Anchor's tools
    echo "Attempting to generate IDL from program binary..."
    anchor idl init -f target/idl/$PROGRAM_NAME.json $PROGRAM_NAME
    
    if [ -f "target/idl/$PROGRAM_NAME.json" ]; then
        echo "Successfully generated IDL file with anchor idl init"
        cp "target/idl/$PROGRAM_NAME.json" "target/types/$PROGRAM_NAME.ts"
    else
        echo "IDL generation failed. Creating a minimal IDL file manually..."
        
        # Method 3: Create a minimal IDL manually
        cat > "target/idl/$PROGRAM_NAME.json" << EOL
{
  "version": "0.1.0",
  "name": "$PROGRAM_NAME",
  "instructions": [
    {
      "name": "initializeElection",
      "accounts": [
        {
          "name": "election",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "electionName",
          "type": "string"
        },
        {
          "name": "candidates",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "startTime",
          "type": "i64"
        },
        {
          "name": "endTime",
          "type": "i64"
        }
      ]
    },
    {
      "name": "castVote",
      "accounts": [
        {
          "name": "election",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "voter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "voterSigner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "candidateIndex",
          "type": "u8"
        },
        {
          "name": "verificationHash",
          "type": "string"
        }
      ]
    },
    {
      "name": "endElection",
      "accounts": [
        {
          "name": "election",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "Election",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "electionName",
            "type": "string"
          },
          {
            "name": "candidates",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "votes",
            "type": {
              "vec": "u32"
            }
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "totalVoters",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "Voter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "hasVoted",
            "type": "bool"
          },
          {
            "name": "verificationHash",
            "type": "string"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "ElectionNotActive",
      "msg": "The election is not active"
    },
    {
      "code": 6001,
      "name": "ElectionNotInProgress",
      "msg": "The election is not in progress"
    },
    {
      "code": 6002,
      "name": "AlreadyVoted",
      "msg": "You have already voted in this election"
    },
    {
      "code": 6003,
      "name": "InvalidCandidate",
      "msg": "Invalid candidate index"
    },
    {
      "code": 6004,
      "name": "Unauthorized",
      "msg": "Unauthorized to perform this action"
    }
  ],
  "metadata": {
    "address": "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
  }
}
EOL
        echo "Created manual IDL file at target/idl/$PROGRAM_NAME.json"
        cp "target/idl/$PROGRAM_NAME.json" "target/types/$PROGRAM_NAME.ts"
    fi
fi

# Verify IDL exists
if [ -f "target/idl/$PROGRAM_NAME.json" ]; then
    echo "Success! IDL file is ready."
    echo "Try running 'anchor test' now."
else
    echo "Failed to create IDL file."
fi