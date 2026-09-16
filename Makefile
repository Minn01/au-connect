# AU Connect — production deployment helpers.
# Mirrors the workflow used for other life.au.edu apps.
COMPOSE = docker compose -f docker-compose.prod.yml

.PHONY: prod-up prod-down prod-restart prod-pull prod-logs prod-ps

prod-up:        ## Pull images and start the full stack in the background
	$(COMPOSE) pull
	$(COMPOSE) up -d

prod-down:      ## Stop and remove the stack (the Mongo data volume is kept)
	$(COMPOSE) down

prod-restart:   ## Restart just the app container
	$(COMPOSE) restart au-connect

prod-pull:      ## Manually pull the latest image (Watchtower also does this)
	$(COMPOSE) pull au-connect

prod-logs:      ## Follow logs for all services
	$(COMPOSE) logs -f

prod-ps:        ## Show running services
	$(COMPOSE) ps
