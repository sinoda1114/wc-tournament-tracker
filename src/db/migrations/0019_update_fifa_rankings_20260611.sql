-- FIFA/Coca-Cola Men's World Ranking 2026-06-11 公式更新を優勝予想用チームレーティングへ反映する。
UPDATE teams
SET
  fifa_rank = CASE id
    WHEN 'mex' THEN 14
    WHEN 'rsa' THEN 60
    WHEN 'kor' THEN 25
    WHEN 'cze' THEN 40
    WHEN 'can' THEN 30
    WHEN 'bih' THEN 64
    WHEN 'qat' THEN 56
    WHEN 'sui' THEN 19
    WHEN 'bra' THEN 6
    WHEN 'mar' THEN 7
    WHEN 'hai' THEN 83
    WHEN 'sco' THEN 42
    WHEN 'usa' THEN 17
    WHEN 'par' THEN 41
    WHEN 'aus' THEN 27
    WHEN 'tur' THEN 22
    WHEN 'ger' THEN 10
    WHEN 'cuw' THEN 82
    WHEN 'civ' THEN 33
    WHEN 'ecu' THEN 23
    WHEN 'ned' THEN 8
    WHEN 'jpn' THEN 18
    WHEN 'swe' THEN 38
    WHEN 'tun' THEN 45
    WHEN 'bel' THEN 9
    WHEN 'egy' THEN 29
    WHEN 'irn' THEN 20
    WHEN 'nzl' THEN 85
    WHEN 'esp' THEN 2
    WHEN 'cpv' THEN 67
    WHEN 'ksa' THEN 61
    WHEN 'uru' THEN 16
    WHEN 'fra' THEN 3
    WHEN 'sen' THEN 15
    WHEN 'irq' THEN 57
    WHEN 'nor' THEN 31
    WHEN 'arg' THEN 1
    WHEN 'alg' THEN 28
    WHEN 'aut' THEN 24
    WHEN 'jor' THEN 63
    WHEN 'por' THEN 5
    WHEN 'cod' THEN 46
    WHEN 'uzb' THEN 50
    WHEN 'col' THEN 13
    WHEN 'eng' THEN 4
    WHEN 'cro' THEN 11
    WHEN 'gha' THEN 73
    WHEN 'pan' THEN 34
  END
WHERE id IN ('mex', 'rsa', 'kor', 'cze', 'can', 'bih', 'qat', 'sui', 'bra', 'mar', 'hai', 'sco', 'usa', 'par', 'aus', 'tur', 'ger', 'cuw', 'civ', 'ecu', 'ned', 'jpn', 'swe', 'tun', 'bel', 'egy', 'irn', 'nzl', 'esp', 'cpv', 'ksa', 'uru', 'fra', 'sen', 'irq', 'nor', 'arg', 'alg', 'aut', 'jor', 'por', 'cod', 'uzb', 'col', 'eng', 'cro', 'gha', 'pan');
