SELECT * FROM biblioteca.loan;       -- debe tener tu préstamo
SELECT * FROM biblioteca.loanitem;   -- el detalle con bookId=13 (El Principito)
SELECT * FROM biblioteca.hold;       -- tu lista de espera para Orgullo y Prejuicio
SELECT * FROM biblioteca.book WHERE id = 13;  -- stock debió bajar a 4