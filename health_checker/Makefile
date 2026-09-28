CC = gcc
# _POSIX_C_SOURCE habilita las funciones de POSIX que no son parte del C estandar, como
# clock_gettime con CLOCK_MONOTONIC, que se usa para medir el round-trip time. Sin esta macro,
# -std=c11 -pedantic las esconde y la compilacion falla.
CFLAGS = -Wall -Wextra -pedantic -std=c11 -D_POSIX_C_SOURCE=200809L -O2 -Iinclude -Ilib
LDFLAGS = -lcurl

SRCS = src/main.c src/models.c src/supabase_client.c src/tcp_checker.c src/http_checker.c lib/cJSON.c
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
