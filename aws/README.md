# wavekb framework

This directory contains a SaaS builder mini framework built with AWS CDK and a now-defunct construct called "docker-compose-cdk".

The goal of the framework is to establish a replica of the deployment on AWS locally, so that it's much easier to iterate on the development of this project.

To replicate AWS services, a collection of free Docker containers and tools are used and synthesized into a docker-compose.yml file alongside the main CDK infrastructure.
