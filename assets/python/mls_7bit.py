def next_state(s):
    # s = [b0, b1, b2, b3, b4, b5, b6]
    return s[1:] + [s[0] ^ s[3]]

def prev_state(s):
    # inverse of next_state()
    return [s[6] ^ s[2]] + s[:6]

centre = [1, 1, 1, 1, 1, 1, 1]

# 63 rows before centre
left = []
s = centre[:]
for _ in range(63):
    s = prev_state(s)
    left.append(s)

left.reverse()

# centre plus 63 rows after centre
right = [centre]
s = centre[:]
for _ in range(63):
    s = next_state(s)
    right.append(s)

table = left + right

# checks
assert len(table) == 127
assert len(set(tuple(row) for row in table)) == 127
assert [sum(row[col] for row in table) for col in range(7)] == [64] * 7
assert [0, 0, 0, 0, 0, 0, 0] not in table

for row in table:
    print("\t".join(str(x) for x in row))