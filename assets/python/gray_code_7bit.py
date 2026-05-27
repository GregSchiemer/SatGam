# gray_code_7bit.py
#
# Generate a 127-row, 7-column non-zero 7-bit state table.
#
# This is not an LFSR MLS ordering.
# It is a Gray-code ordering of all non-zero 7-bit states.
#
# Properties:
#   - 127 rows
#   - no 0000000 row
#   - every non-zero 7-bit state appears exactly once
#   - every column contains 64 ones
#   - successive rows differ by exactly one bit
#   - therefore successive Hamming weights differ by exactly 1
#   - first and last rows both have Hamming weight 1


BITS = 7


def gray_code(i):
    """
    Standard binary-reflected Gray code.
    Consecutive values differ by exactly one bit.
    """
    return i ^ (i >> 1)


def int_to_bits(value, width):
    """
    Convert integer to a list of bits, most-significant bit first.
    """
    return [(value >> shift) & 1 for shift in range(width - 1, -1, -1)]


def hamming_weight(row):
    """
    Number of ones in a row.
    """
    return sum(row)


def hamming_distance(a, b):
    """
    Number of bit positions where two rows differ.
    """
    return sum(x != y for x, y in zip(a, b))


# Generate all non-zero 7-bit Gray-code states.
#
# The full 7-bit Gray code has 128 states, including 0000000.
# Starting from i = 1 skips the zero state but preserves adjacency.
table = [
    int_to_bits(gray_code(i), BITS)
    for i in range(1, 2 ** BITS)
]


# Basic MLS-style coverage checks.
assert len(table) == 127
assert len(set(tuple(row) for row in table)) == 127
assert [0] * BITS not in table

# Column-balance check.
assert [sum(row[col] for row in table) for col in range(BITS)] == [64] * BITS

# Gray-code adjacency checks.
for i in range(len(table) - 1):
    assert hamming_distance(table[i], table[i + 1]) == 1
    assert abs(hamming_weight(table[i + 1]) - hamming_weight(table[i])) == 1

# Extremity checks.
assert hamming_weight(table[0]) == 1
assert hamming_weight(table[-1]) == 1


# Print tab-separated table.
for row in table:
    print("\t".join(str(x) for x in row))