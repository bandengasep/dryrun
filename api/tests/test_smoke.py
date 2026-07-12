"""Phase 0 smoke test — proves the CI toolchain (uv sync + pytest) is wired and
the `app` package skeleton imports. Replaced by real parser/diff tests in Commit 1+."""


def test_python_toolchain_runs():
    assert 2 + 2 == 4


def test_app_package_importable():
    import app

    assert app.__doc__ is not None
