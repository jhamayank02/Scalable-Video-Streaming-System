# Video Processing System

This repository contains the architecture and workflow for an asynchronous video processing system built using AWS S3, SQS, ECS, and MongoDB.

The system is designed to reliably handle video uploads, background processing, retries, and failure handling using queues and a dead-letter queue (DLQ).

---

## Architecture Overview

<img width="1257" height="1222" alt="Drawing 2026-01-15 12 12 08 excalidraw" src="https://github.com/user-attachments/assets/3184fb8c-2da4-4cb0-a0b3-a4fa9f9703f9" />

---

## Components

### Client
- Requests a pre-signed S3 URL from the server
- Uploads video directly to S3 (unprocessed bucket)

---

### Server
- Generates pre-signed S3 upload URLs
- Stores video metadata in MongoDB
- Listens to the Unprocessed Video SQS
- Triggers ECS tasks for video processing
- Receives processing completion notifications

---

### S3
- `unprocessed/` – Stores newly uploaded videos
- `processed/` – Stores processed videos
- Sends S3 event notifications to SQS on upload

---

### SQS Queues

#### Unprocessed Video Queue
- Receives S3 event notifications
- Source queue for video processing
- Configured with a Dead Letter Queue (DLQ)

#### Dead Letter Queue (DLQ)
- Automatically receives messages after max retries
- Used for debugging and manual reprocessing

#### Processed Video Queue
- Receives notifications after successful processing
- Used to update state and cleanup

---

### ECS (Elastic Container Service)
- Each SQS message triggers an ECS task
- ECS task responsibilities:
  - Download video from S3
  - Process/transcode the video
  - Upload processed output to S3
  - Send success message to Processed Video SQS
  - Deletes message from unprocessed queue

---

### MongoDB
- Stores video-related metadata:
  - Video ID
  - Upload status
  - Processing status
  - Error details (if any)

---

## Processing Flow

1. Client requests a pre-signed S3 URL
2. Client uploads video to S3 (`unprocessed/`)
3. S3 sends an event to Unprocessed Video SQS
4. Server receives message and starts ECS task
5. ECS processes the video
6. Processed video uploaded to S3 (`processed/`)
7. ECS sends notification to Processed Video SQS
8. Server updates MongoDB and deletes the SQS message
9. Failed messages are moved to the DLQ after max retries

---

## Failure Handling

- SQS automatically retries failed messages
- Messages exceeding `maxReceiveCount` go to DLQ
- Messages are deleted only after successful processing
- Visibility timeout prevents duplicate parallel processing

---

## AWS Services Used

- Amazon S3
- Amazon SQS (Standard Queue + DLQ)
- Amazon ECR and ECS
- MongoDB
- AWS IAM

---

## Future Improvements

- CloudWatch alarms for DLQ depth
- Retry backoff strategy
- Manual DLQ reprocessing
- Idempotent ECS processing

---
