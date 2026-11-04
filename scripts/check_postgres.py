"""Smoke test against the running API and real PostgreSQL; removes its own test data."""
import json
import os
import subprocess
import uuid
import urllib.request
import urllib.error

base = os.environ.get('TEST_API_URL', 'http://localhost:8080/api')
suffix = uuid.uuid4().hex[:12]
names = ['check_' + suffix, 'other_' + suffix]
headers = {}


def request(method, path, body=None, token=None, expected=200):
    data = None if body is None else json.dumps(body).encode('utf-8')
    req = urllib.request.Request(base + path, data=data, method=method,
                                 headers={'Content-Type': 'application/json', **({'Authorization': 'Bearer ' + token} if token else {})})
    try:
        with urllib.request.urlopen(req) as response:
            assert response.status == expected, response.status
            payload = response.read()
            return json.loads(payload) if payload else None
    except urllib.error.HTTPError as error:
        assert error.code == expected, (error.code, error.read().decode())


def sql(statement):
    env = dict(os.environ, PGPASSWORD=os.environ.get('DB_PASSWORD', 'postgres'))
    return subprocess.check_output(['psql', '-X', '-w', '-h', os.environ.get('PGHOST', 'localhost'),
                                    '-U', os.environ.get('DB_USERNAME', 'postgres'), '-d', 'publication_system',
                                    '-v', 'ON_ERROR_STOP=1', '-tAc', statement], env=env, text=True).strip()


publication_id = None
try:
    sessions = [request('POST', '/auth/register', {'username': name, 'password': uuid.uuid4().hex}, expected=201) for name in names]
    token, other = [session['accessToken'] for session in sessions]
    body = {'title': 'PostgreSQL integration check', 'authors': 'Test Author', 'year': 2026,
            'type': '\u0421\u0442\u0430\u0442\u044c\u044f',
            'department': '\u0418\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0435 \u0441\u0438\u0441\u0442\u0435\u043c\u044b', 'owner': 'Test Employee'}
    created = request('POST', '/publications', body, token, 201)
    publication_id = created['id']
    path = '/publications/' + str(publication_id)
    assert sql(f'SELECT count(*) FROM publication WHERE id={publication_id}') == '1'
    assert request('GET', path, token=token)['title'] == body['title']
    request('PUT', path, body, other, 403)
    request('DELETE', path, token=other, expected=403)
    request('POST', '/publications', {**body, 'year': 1800}, token, 400)
    request('GET', '/publications', expected=401)
    updated = request('PUT', path, {**body, 'title': 'Updated integration check'}, token)
    assert updated['title'] == 'Updated integration check'
    assert sql(f"SELECT title FROM publication WHERE id={publication_id}") == updated['title']
    request('DELETE', path, token=token, expected=204)
    request('GET', path, token=token, expected=404)
    assert sql(f'SELECT count(*) FROM publication WHERE id={publication_id}') == '0'
    print('PASS: registration, PostgreSQL persistence, CRUD, validation, authentication and ownership')
finally:
    # Names are generated above from a hex UUID, never supplied by the caller.
    sql("DELETE FROM publication WHERE author_id IN (SELECT id FROM users WHERE username IN ('" + "','".join(names) + "'))")
    sql("DELETE FROM users WHERE username IN ('" + "','".join(names) + "')")
