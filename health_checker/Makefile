CC = gcc
CFLAGS = -Wall -Wextra -pedantic -std=c11 -O2 -Iinclude -Ilib
LDFLAGS = -lcurl

SRCS = src/main.c src/models.c src/supabase_client.c src/tcp_checker.c lib/cJSON.c
OBJS = $(SRCS:.c=.o)
TARGET = health_checker_bin

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(TARGET)

run: $(TARGET)
	./$(TARGET)

.PHONY: all clean run
