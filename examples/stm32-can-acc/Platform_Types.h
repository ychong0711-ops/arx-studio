#ifndef PLATFORM_TYPES_H
#define PLATFORM_TYPES_H

/*
 * Host-oriented subset of the AUTOSAR Platform_Types.h.
 * Maps the AUTOSAR type names onto the <stdint.h> fixed-width types.
 */

#include <stdint.h>

typedef uint8_t  uint8;
typedef uint16_t uint16;
typedef uint32_t uint32;
typedef uint64_t uint64;

typedef int8_t   sint8;
typedef int16_t  sint16;
typedef int32_t  sint32;
typedef int64_t  sint64;

typedef uint8_t  boolean; /* AUTOSAR boolean (TRUE/FALSE below) */
typedef float    float32;
typedef double   float64;

#ifndef TRUE
#define TRUE  ((boolean)1u)
#endif
#ifndef FALSE
#define FALSE ((boolean)0u)
#endif

#endif /* PLATFORM_TYPES_H */