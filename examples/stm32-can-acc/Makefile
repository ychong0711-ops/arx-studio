# Host build for the STM32/CAN ACC closed-loop demo (examples/stm32-can-acc).
#
#   make        build acc_demo
#   make run    build and run it
#   make clean  remove the binary
#
# can_hal_stm32_hal.c.template is intentionally NOT compiled: the host build
# uses can_hal_mock.c as the CAN abstraction, and the file-name extension
# (.template) keeps it out of any wildcard/glob based build list.

CC      ?= gcc
CFLAGS  ?= -std=c99 -Wall -Wextra -Werror
TARGET  := acc_demo

SRCS := can_hal_mock.c sensor_sim.c rte_impl.c acc_app.c throttle_actr.c main.c
HDRS := Platform_Types.h Std_Types.h rte_contract.h can_hal.h sensor_sim.h rte_impl.h

$(TARGET): $(SRCS) $(HDRS)
	$(CC) $(CFLAGS) $(SRCS) -o $(TARGET)

run: $(TARGET)
	./$(TARGET)

clean:
	$(RM) $(TARGET)

.PHONY: run clean